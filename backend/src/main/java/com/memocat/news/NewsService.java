package com.memocat.news;

import com.memocat.link.PageFetcher;
import com.memocat.news.dto.NewsItemDto;
import com.memocat.news.dto.NewsSourceDto;
import com.memocat.news.dto.YoutubeChannelDto;
import com.memocat.domain.User;
import com.memocat.profile.ProfileService;
import com.memocat.profile.dto.NewsPrefsDto;
import com.memocat.repository.UserRepository;
import com.memocat.security.SecretBox;
import com.memocat.web.ContentValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The "Actus" tab: each person's own choice of news sites and public
 * accounts, read without any account on those services. Feeds are fetched by
 * the server (so phones never contact them), all at once, and kept 20 minutes;
 * a source that fails keeps its last items and is retried a bit later.
 * Pictures go through {@link #image}, which only serves those of items it read.
 */
@Service
public class NewsService {

    private static final Logger log = LoggerFactory.getLogger(NewsService.class);
    static final Duration FRESH = Duration.ofMinutes(20);
    static final Duration RETRY = Duration.ofMinutes(5);
    static final int MAX_FOLLOWS = 20;
    static final int MAX_ITEMS = 80;
    private static final int MAX_FEED_BYTES = 2_000_000;
    private static final int MAX_IMAGE_BYTES = 2_000_000;
    // Kept pictures stay well under the server's memory (a count alone could reach 240 MB).
    static final long MAX_KEPT_IMAGE_BYTES = 20_000_000;
    private static final String AGENT = "MemoCat/1.0 (lecteur personnel de flux)";
    private static final String FEED_ACCEPT = "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5";

    private static final Map<String, Pattern> HANDLES = Map.of(
            "bluesky", Pattern.compile("^@?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)$"),
            "mastodon", Pattern.compile("^@?([A-Za-z0-9_]{1,30})@([a-zA-Z0-9-]{1,63}(?:\\.[a-zA-Z0-9-]{1,63})+)$"),
            "reddit", Pattern.compile("^(?:r/)?([A-Za-z0-9_]{2,21})$"),
            // A YouTube channel (its Shorts): @handle, channel id, or either one's link.
            "youtube", Pattern.compile("^(?:https?://(?:www\\.|m\\.)?youtube\\.com/)?(?:channel/(UC[A-Za-z0-9_-]{22})|(UC[A-Za-z0-9_-]{22})|@([A-Za-z0-9._-]{3,30}))(?:[/?#].*)?$"),
            "xpost", Pattern.compile("^https://(?:www\\.)?(?:x|twitter)\\.com/([A-Za-z0-9_]{1,15})/status/(\\d{1,25})(?:[/?#].*)?$"),
            // Any site or feed I add myself: its address, the feed is found on the page if needed.
            "rss", Pattern.compile("^(?i:(https?)://)?([a-zA-Z0-9-]{1,63}(?:\\.[a-zA-Z0-9-]{1,63})+)(/[^\\s\"'<>]*)?$"));
    private static final Map<String, String> KIND_LABEL = Map.of(
            "bluesky", "Bluesky", "mastodon", "Mastodon", "reddit", "Reddit", "xpost", "X", "rss", "Site", "youtube", "YouTube");
    // My Reddit home feed's private link (reddit.com/prefs/feeds), kept only as feed + user.
    private static final Pattern REDDIT_HOME = Pattern.compile("^https://(?:www\\.|old\\.)?reddit\\.com/\\.rss\\?(\\S+)$");
    private static final Pattern REDDIT_FEED = Pattern.compile("(?:^|&)feed=([A-Za-z0-9]{8,80})(?:&|$)");
    private static final Pattern REDDIT_USER = Pattern.compile("(?:^|&)user=([A-Za-z0-9_-]{3,20})(?:&|$)");
    // YouTube shows a cookie-consent page to servers in Europe unless consent is already given.
    private static final String YOUTUBE_COOKIE = "SOCS=CAI; CONSENT=YES+";
    private static final String BROWSER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
    static final int MAX_SEARCH_HITS = 10;
    private static final int MAX_SEARCHES_KEPT = 50;
    private static final Pattern CHANNEL_ID = Pattern.compile("youtube\\.com/channel/(UC[A-Za-z0-9_-]{22})");

    private record Target(String key, String label, String kind, URI uri, Function<byte[], List<FeedParser.Entry>> parse) {
    }

    private record Cached(List<NewsItemDto> items, Instant fetchedAt, boolean failed) {
    }

    private final ProfileService profiles;
    private final PageFetcher fetcher;
    private final UserRepository users;
    private final SecretBox box;
    private final Clock clock;
    /** Recent channel searches (query → channels), so retyping costs nothing; bounded. */
    private final Map<String, List<YoutubeChannelDto>> searches = Collections.synchronizedMap(new LinkedHashMap<>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, List<YoutubeChannelDto>> eldest) {
            return size() > MAX_SEARCHES_KEPT;
        }
    });
    /** @handle → channel id, found once on the channel's page. */
    private final Map<String, String> channelIds = new ConcurrentHashMap<>();
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();
    private final Map<String, PageFetcher.Fetched> images = Collections.synchronizedMap(new LinkedHashMap<>(64, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, PageFetcher.Fetched> eldest) {
            return size() > 120;
        }
    });

    @Autowired
    public NewsService(ProfileService profiles, PageFetcher fetcher, UserRepository users, SecretBox box) {
        this(profiles, fetcher, users, box, Clock.systemUTC());
    }

    NewsService(ProfileService profiles, PageFetcher fetcher, UserRepository users, SecretBox box, Clock clock) {
        this.profiles = profiles;
        this.fetcher = fetcher;
        this.users = users;
        this.box = box;
        this.clock = clock;
    }

    public List<NewsSourceDto> catalog() {
        return NewsCatalog.SOURCES.stream().map(s -> new NewsSourceDto(s.id(), s.label(), s.site())).toList();
    }

    public NewsPrefsDto prefs(String username) {
        NewsPrefsDto p = profiles.newsPrefs(username);
        return p == null ? new NewsPrefsDto(false, List.of(), List.of()) : p;
    }

    /** Checks and saves my choices: known sites, well-formed accounts, no duplicates. */
    public NewsPrefsDto savePrefs(String username, NewsPrefsDto prefs) {
        List<String> sources = prefs == null || prefs.sources() == null ? List.of() : prefs.sources();
        List<NewsPrefsDto.Follow> follows = prefs == null || prefs.follows() == null ? List.of() : prefs.follows();
        for (String id : sources) {
            if (id == null || NewsCatalog.find(id).isEmpty()) {
                throw new ContentValidationException("Source inconnue");
            }
        }
        if (follows.size() > MAX_FOLLOWS) {
            throw new ContentValidationException("Trop de comptes suivis (max " + MAX_FOLLOWS + ")");
        }
        List<NewsPrefsDto.Follow> clean = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (NewsPrefsDto.Follow f : follows) {
            NewsPrefsDto.Follow n = normalize(f);
            if (seen.add(n.kind() + ":" + n.handle().toLowerCase())) {
                clean.add(n);
            }
        }
        boolean enabled = prefs != null && Boolean.TRUE.equals(prefs.enabled());
        NewsPrefsDto saved = new NewsPrefsDto(enabled, List.copyOf(new LinkedHashSet<>(sources)), clean);
        profiles.updateNews(username, saved);
        return saved;
    }

    /** My tab: the latest items of everything I turned on, newest first (nothing while the tab is off). */
    public List<NewsItemDto> items(String username) {
        NewsPrefsDto prefs = prefs(username);
        if (!Boolean.TRUE.equals(prefs.enabled())) {
            return List.of();
        }
        List<Target> targets = new ArrayList<>(targets(prefs));
        redditHomeLink(username).ifPresent(link -> targets.add(new Target(redditHomeKey(username), "Reddit · mon fil", "reddit",
                URI.create(link), FeedParser::parseFeed)));
        if (targets.isEmpty()) {
            return List.of();
        }
        List<NewsItemDto> all = new ArrayList<>();
        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<List<NewsItemDto>>> jobs = targets.stream().map(t -> pool.submit(() -> read(t))).toList();
            for (Future<List<NewsItemDto>> job : jobs) {
                try {
                    all.addAll(job.get(15, TimeUnit.SECONDS));
                } catch (Exception e) {
                    // that source is skipped this time
                }
            }
        }
        return all.stream()
                .sorted(Comparator.comparing(NewsItemDto::publishedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX_ITEMS)
                .toList();
    }

    /** A picture of an item already read (never an arbitrary address). */
    public Optional<PageFetcher.Fetched> image(String url) {
        boolean known = cache.values().stream().anyMatch(c -> c.items().stream().anyMatch(i -> url.equals(i.image())))
                || searchImage(url);
        if (!known) {
            return Optional.empty();
        }
        PageFetcher.Fetched kept = images.get(url);
        if (kept != null) {
            return Optional.of(kept);
        }
        try {
            // Raster pictures only (an SVG could carry script).
            Optional<PageFetcher.Fetched> got = fetcher.fetch(URI.create(url), MAX_IMAGE_BYTES, "image/*", AGENT)
                    .filter(f -> f.contentType().startsWith("image/") && !f.contentType().contains("svg"));
            got.ifPresent(f -> keep(url, f));
            return got;
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    private boolean searchImage(String url) {
        synchronized (searches) {
            return searches.values().stream().anyMatch(list -> list.stream().anyMatch(c -> url.equals(c.image())));
        }
    }

    /** Adds a picture, then drops the least recently shown ones past the byte budget. */
    private void keep(String url, PageFetcher.Fetched f) {
        synchronized (images) {
            images.put(url, f);
            long total = images.values().stream().mapToLong(i -> i.body().length).sum();
            var eldestFirst = images.values().iterator();
            while (total > MAX_KEPT_IMAGE_BYTES && eldestFirst.hasNext()) {
                total -= eldestFirst.next().body().length;
                eldestFirst.remove();
            }
        }
    }

    private List<NewsItemDto> read(Target t) {
        Instant now = clock.instant();
        Cached c = cache.get(t.key());
        if (c != null && now.isBefore(c.fetchedAt().plus(c.failed() ? RETRY : FRESH))) {
            return c.items();
        }
        try {
            boolean json = t.kind().equals("bluesky") || t.kind().equals("x");
            URI uri = t.kind().equals("youtube") ? shortsFeed(t.uri()) : t.uri();
            Optional<PageFetcher.Fetched> body = t.kind().equals("youtube")
                    ? fetcher.fetch(uri, MAX_FEED_BYTES, FEED_ACCEPT, AGENT, YOUTUBE_COOKIE)
                    : fetcher.fetch(uri, MAX_FEED_BYTES, json ? "application/json" : FEED_ACCEPT, AGENT);
            if (body.isEmpty()) {
                throw new IllegalStateException("no answer");
            }
            List<FeedParser.Entry> entries;
            try {
                entries = t.parse().apply(body.get().body());
            } catch (IllegalArgumentException notAFeed) {
                // A site's page rather than its feed: follow the feed it announces.
                if (!t.kind().equals("site") || !body.get().contentType().contains("html")) {
                    throw notAFeed;
                }
                URI feed = FeedParser.discoverFeed(body.get().body(), body.get().finalUri())
                        .orElseThrow(() -> new IllegalStateException("no feed on the page"));
                entries = FeedParser.parseFeed(fetcher.fetch(feed, MAX_FEED_BYTES, FEED_ACCEPT, AGENT)
                        .orElseThrow(() -> new IllegalStateException("no answer")).body());
            }
            List<NewsItemDto> items = entries.stream()
                    .filter(e -> e.url() != null && (e.title() != null || e.text() != null))
                    .map(e -> new NewsItemDto(t.key(), t.label(), t.kind(), e.title(), e.text(), e.url(), e.image(), e.author(), e.publishedAt()))
                    .toList();
            cache.put(t.key(), new Cached(items, now, false));
            return items;
        } catch (RuntimeException e) {
            log.debug("News: {} unavailable ({})", t.uri().getHost(), e.getClass().getSimpleName());
            List<NewsItemDto> old = c == null ? List.of() : c.items();
            cache.put(t.key(), new Cached(old, now, true));
            return old;
        }
    }

    private static List<Target> targets(NewsPrefsDto prefs) {
        List<Target> out = new ArrayList<>();
        for (String id : prefs.sources() == null ? List.<String>of() : prefs.sources()) {
            NewsCatalog.find(id).ifPresent(s ->
                    out.add(new Target(s.id(), s.label(), "site", URI.create(s.feed()), FeedParser::parseFeed)));
        }
        for (NewsPrefsDto.Follow f : prefs.follows() == null ? List.<NewsPrefsDto.Follow>of() : prefs.follows()) {
            Matcher m = HANDLES.getOrDefault(f.kind(), Pattern.compile("$^")).matcher(f.handle() == null ? "" : f.handle());
            if (!m.matches()) {
                continue; // saved by an older version: skipped rather than fetched
            }
            String key = f.kind() + ":" + f.handle();
            switch (f.kind()) {
                case "bluesky" -> out.add(new Target(key, "@" + m.group(1), "bluesky",
                        URI.create("https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor="
                                + URLEncoder.encode(m.group(1), StandardCharsets.UTF_8) + "&limit=15&filter=posts_no_replies"),
                        FeedParser::parseBluesky));
                case "mastodon" -> out.add(new Target(key, "@" + m.group(1) + "@" + m.group(2), "mastodon",
                        URI.create("https://" + m.group(2) + "/@" + m.group(1) + ".rss"), FeedParser::parseFeed));
                case "reddit" -> out.add(new Target(key, "r/" + m.group(1), "reddit",
                        URI.create("https://www.reddit.com/r/" + m.group(1) + "/.rss"), FeedParser::parseFeed));
                case "xpost" -> out.add(new Target(key, "@" + m.group(1), "x",
                        URI.create("https://api.fxtwitter.com/" + m.group(1) + "/status/" + m.group(2)), FeedParser::parseFxTweet));
                case "rss" -> out.add(new Target(key, m.group(2).toLowerCase().replaceFirst("^www\\.", ""), "site",
                        URI.create(f.handle()), FeedParser::parseFeed));
                case "youtube" -> out.add(new Target(key, f.label() != null ? f.label() : m.group(3) != null ? "@" + m.group(3) : "YouTube", "youtube",
                        URI.create(m.group(3) != null ? "https://www.youtube.com/@" + m.group(3)
                                : "https://www.youtube.com/channel/" + (m.group(1) != null ? m.group(1) : m.group(2))),
                        FeedParser::parseYoutubeShorts));
                default -> {
                }
            }
        }
        return out;
    }

    /**
     * YouTube channels matching a few words, read from YouTube's own search
     * page (channels only): pick one and its Shorts are followed by channel id.
     * Their pictures can then be shown through {@link #image}.
     */
    public List<YoutubeChannelDto> searchYoutube(String query) {
        String q = query == null ? "" : query.strip().replaceAll("\\s+", " ");
        if (q.length() < 2 || q.length() > 60) {
            throw new ContentValidationException("Tape entre 2 et 60 caractères");
        }
        String key = q.toLowerCase(Locale.ROOT);
        List<YoutubeChannelDto> kept = searches.get(key);
        if (kept != null) {
            return kept;
        }
        URI uri = URI.create("https://www.youtube.com/results?search_query=" + URLEncoder.encode(q, StandardCharsets.UTF_8)
                + "&sp=EgIQAg%253D%253D"); // filter: channels
        List<YoutubeChannelDto> found = fetcher.fetch(uri, 3_000_000, "text/html", BROWSER_AGENT, YOUTUBE_COOKIE)
                .map(page -> FeedParser.parseYoutubeChannels(page.body(), MAX_SEARCH_HITS))
                .orElseThrow(() -> new ContentValidationException("YouTube ne répond pas, réessaie un peu plus tard"));
        searches.put(key, found);
        return found;
    }

    /** The names of my sources that answered nothing on their last try (to say so in the tab). */
    public List<String> failing(String username) {
        NewsPrefsDto prefs = prefs(username);
        if (!Boolean.TRUE.equals(prefs.enabled())) {
            return List.of();
        }
        List<Target> targets = new ArrayList<>(targets(prefs));
        redditHomeLink(username).ifPresent(link -> targets.add(new Target(redditHomeKey(username), "Reddit · mon fil", "reddit",
                URI.create(link), FeedParser::parseFeed)));
        return targets.stream()
                .filter(t -> {
                    Cached c = cache.get(t.key());
                    return c != null && c.failed() && c.items().isEmpty();
                })
                .map(Target::label)
                .toList();
    }

    /**
     * A channel's Shorts feed (its "UUSH…" playlist). A channel given by its
     * @handle is looked up once on its page (served to link-preview robots
     * without any consent screen), then remembered.
     */
    private URI shortsFeed(URI channel) {
        String path = channel.getPath();
        String id = path.startsWith("/channel/") ? path.substring("/channel/".length()) : channelIds.get(path);
        if (id == null) {
            byte[] page = fetcher.fetch(channel, 1_500_000, "text/html", BROWSER_AGENT, YOUTUBE_COOKIE)
                    .orElseThrow(() -> new IllegalStateException("no answer")).body();
            Matcher m = CHANNEL_ID.matcher(new String(page, StandardCharsets.UTF_8));
            if (!m.find()) {
                throw new IllegalStateException("channel id not found");
            }
            id = m.group(1);
            channelIds.put(path, id);
        }
        return URI.create("https://www.youtube.com/feeds/videos.xml?playlist_id=UUSH" + id.substring(2));
    }

    /** The Reddit account whose home feed I added (never the link itself), or empty. */
    public Optional<String> redditHomeUser(String username) {
        return redditHomeLink(username).map(link -> {
            Matcher m = REDDIT_USER.matcher(URI.create(link).getRawQuery());
            return m.find() ? m.group(1) : "?";
        });
    }

    /** Adds (or replaces) my Reddit home feed from its private link; returns the Reddit account. */
    public String saveRedditHome(String username, String link) {
        Matcher whole = REDDIT_HOME.matcher(link == null ? "" : link.strip());
        Matcher feed = whole.matches() ? REDDIT_FEED.matcher(whole.group(1)) : null;
        Matcher user = whole.matches() ? REDDIT_USER.matcher(whole.group(1)) : null;
        if (feed == null || !feed.find() || !user.find()) {
            throw new ContentValidationException("Lien invalide : colle le lien RSS de ton fil d'accueil Reddit (…reddit.com/.rss?feed=…&user=…)");
        }
        User me = users.findByUsername(username).orElseThrow();
        me.setNewsRedditFeed(box.seal("https://www.reddit.com/.rss?feed=" + feed.group(1) + "&user=" + user.group(1)));
        users.save(me);
        cache.remove(redditHomeKey(username));
        return user.group(1);
    }

    public void removeRedditHome(String username) {
        User me = users.findByUsername(username).orElseThrow();
        me.setNewsRedditFeed(null);
        users.save(me);
        cache.remove(redditHomeKey(username));
    }

    private Optional<String> redditHomeLink(String username) {
        return users.findByUsername(username)
                .map(User::getNewsRedditFeed)
                .flatMap(box::open);
    }

    private static String redditHomeKey(String username) {
        return "reddithome:" + username;
    }

    private static NewsPrefsDto.Follow normalize(NewsPrefsDto.Follow f) {
        if (f == null || f.kind() == null || !HANDLES.containsKey(f.kind()) || f.handle() == null) {
            throw new ContentValidationException("Compte invalide");
        }
        String handle = f.handle().strip();
        Matcher m = HANDLES.get(f.kind()).matcher(handle);
        if (handle.length() > 300 || !m.matches()) {
            throw new ContentValidationException("Compte " + KIND_LABEL.get(f.kind()) + " invalide : " + handle);
        }
        String clean = switch (f.kind()) {
            case "bluesky", "reddit" -> m.group(1);
            case "youtube" -> m.group(3) != null ? "@" + m.group(3) : (m.group(1) != null ? m.group(1) : m.group(2));
            case "mastodon" -> m.group(1) + "@" + m.group(2).toLowerCase();
            case "rss" -> (m.group(1) == null ? "https" : m.group(1).toLowerCase()) + "://" + m.group(2).toLowerCase()
                    + (m.group(3) == null ? "" : m.group(3));
            default -> "https://x.com/" + m.group(1) + "/status/" + m.group(2);
        };
        String label = f.kind().equals("youtube") && f.label() != null ? FeedParser.clean(f.label(), 80) : null;
        return new NewsPrefsDto.Follow(f.kind(), clean, label == null || label.isBlank() ? null : label);
    }
}
