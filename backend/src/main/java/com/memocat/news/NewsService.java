package com.memocat.news;

import com.memocat.link.PageFetcher;
import com.memocat.news.dto.NewsItemDto;
import com.memocat.news.dto.NewsSourceDto;
import com.memocat.profile.ProfileService;
import com.memocat.profile.dto.NewsPrefsDto;
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
    private static final String AGENT = "MemoCat/1.0 (lecteur personnel de flux)";
    private static final String FEED_ACCEPT = "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5";

    private static final Map<String, Pattern> HANDLES = Map.of(
            "bluesky", Pattern.compile("^@?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)$"),
            "mastodon", Pattern.compile("^@?([A-Za-z0-9_]{1,30})@([a-zA-Z0-9-]{1,63}(?:\\.[a-zA-Z0-9-]{1,63})+)$"),
            "reddit", Pattern.compile("^(?:r/)?([A-Za-z0-9_]{2,21})$"),
            "xpost", Pattern.compile("^https://(?:www\\.)?(?:x|twitter)\\.com/([A-Za-z0-9_]{1,15})/status/(\\d{1,25})(?:[/?#].*)?$"));
    private static final Map<String, String> KIND_LABEL = Map.of(
            "bluesky", "Bluesky", "mastodon", "Mastodon", "reddit", "Reddit", "xpost", "X");

    private record Target(String key, String label, String kind, URI uri, Function<byte[], List<FeedParser.Entry>> parse) {
    }

    private record Cached(List<NewsItemDto> items, Instant fetchedAt, boolean failed) {
    }

    private final ProfileService profiles;
    private final PageFetcher fetcher;
    private final Clock clock;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();
    private final Map<String, PageFetcher.Fetched> images = Collections.synchronizedMap(new LinkedHashMap<>(64, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, PageFetcher.Fetched> eldest) {
            return size() > 120;
        }
    });

    @Autowired
    public NewsService(ProfileService profiles, PageFetcher fetcher) {
        this(profiles, fetcher, Clock.systemUTC());
    }

    NewsService(ProfileService profiles, PageFetcher fetcher, Clock clock) {
        this.profiles = profiles;
        this.fetcher = fetcher;
        this.clock = clock;
    }

    public List<NewsSourceDto> catalog() {
        return NewsCatalog.SOURCES.stream().map(s -> new NewsSourceDto(s.id(), s.label(), s.site())).toList();
    }

    public NewsPrefsDto prefs(String username) {
        NewsPrefsDto p = profiles.newsPrefs(username);
        return p == null ? new NewsPrefsDto(List.of(), List.of()) : p;
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
        NewsPrefsDto saved = new NewsPrefsDto(List.copyOf(new LinkedHashSet<>(sources)), clean);
        profiles.updateNews(username, saved);
        return saved;
    }

    /** My tab: the latest items of everything I turned on, newest first. */
    public List<NewsItemDto> items(String username) {
        List<Target> targets = targets(prefs(username));
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
        boolean known = cache.values().stream().anyMatch(c -> c.items().stream().anyMatch(i -> url.equals(i.image())));
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
            got.ifPresent(f -> images.put(url, f));
            return got;
        } catch (RuntimeException e) {
            return Optional.empty();
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
            Optional<PageFetcher.Fetched> body = fetcher.fetch(t.uri(), MAX_FEED_BYTES, json ? "application/json" : FEED_ACCEPT, AGENT);
            if (body.isEmpty()) {
                throw new IllegalStateException("no answer");
            }
            List<NewsItemDto> items = t.parse().apply(body.get().body()).stream()
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
                default -> {
                }
            }
        }
        return out;
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
            case "mastodon" -> m.group(1) + "@" + m.group(2).toLowerCase();
            default -> "https://x.com/" + m.group(1) + "/status/" + m.group(2);
        };
        return new NewsPrefsDto.Follow(f.kind(), clean);
    }
}
