package com.memocat.news;

import com.memocat.config.JwtProperties;
import com.memocat.domain.User;
import com.memocat.link.PageFetcher;
import com.memocat.profile.ProfileService;
import com.memocat.profile.dto.NewsPrefsDto;
import com.memocat.profile.dto.NewsPrefsDto.Follow;
import com.memocat.repository.UserRepository;
import com.memocat.security.SecretBox;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NewsServiceTest {

    @Mock private ProfileService profiles;
    @Mock private PageFetcher fetcher;
    @Mock private UserRepository users;
    private final SecretBox box = box();
    private NewsService service;

    private static final String RSS = """
            <rss><channel>
              <item><title>Ancien</title><link>https://korben.info/a</link><pubDate>Mon, 22 Sep 2026 10:00:00 GMT</pubDate>
                <enclosure url="https://korben.info/a.jpg" type="image/jpeg"/></item>
              <item><title>Récent</title><link>https://korben.info/b</link><pubDate>Wed, 24 Sep 2026 10:00:00 GMT</pubDate></item>
            </channel></rss>""";

    @BeforeEach
    void setUp() {
        service = new NewsService(profiles, fetcher, users, box, Clock.fixed(Instant.parse("2026-09-25T10:00:00Z"), ZoneOffset.UTC));
    }

    private static SecretBox box() {
        JwtProperties props = new JwtProperties();
        props.setSecret("test-secret-test-secret-test-secret-42");
        return new SecretBox(props);
    }

    private static final String SHORTS = """
            <feed xmlns="http://www.w3.org/2005/Atom">
              <entry><title>Mon short</title><link rel="alternate" href="https://www.youtube.com/watch?v=abcDEF12345"/>
                <author><name>Ma chaîne</name></author><published>2026-09-24T10:00:00+00:00</published>
                <media:group><media:thumbnail url="https://i.ytimg.com/vi/abcDEF12345/hqdefault.jpg"/></media:group></entry>
            </feed>""";

    @Test
    void aYoutubeChannelIsKeptAsItsHandleOrItsId() {
        NewsPrefsDto saved = service.savePrefs("lou", new NewsPrefsDto(true, List.of(), List.of(
                new Follow("youtube", "https://www.youtube.com/@MaChaine/shorts?si=abc"),
                new Follow("youtube", "https://youtube.com/channel/UCabcdefghijklmnopqrstuv"))));
        assertThat(saved.follows()).extracting(Follow::handle).containsExactly("@MaChaine", "UCabcdefghijklmnopqrstuv");
        assertThatThrownBy(() -> service.savePrefs("lou", new NewsPrefsDto(true, List.of(), List.of(new Follow("youtube", "https://evil.example/@x")))))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void aChannelsShortsAreFoundThroughItsPageThenItsShortsFeed() {
        when(profiles.newsPrefs("lou")).thenReturn(new NewsPrefsDto(true, List.of(), List.of(new Follow("youtube", "@MaChaine"))));
        when(fetcher.fetch(eq(URI.create("https://www.youtube.com/@MaChaine")), anyInt(), anyString(), anyString(), anyString()))
                .thenReturn(body("<link rel=\"canonical\" href=\"https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv\">", "text/html"));
        when(fetcher.fetch(eq(URI.create("https://www.youtube.com/feeds/videos.xml?playlist_id=UUSHabcdefghijklmnopqrstuv")), anyInt(), anyString(), anyString(), anyString()))
                .thenReturn(body(SHORTS, "application/atom+xml"));

        var items = service.items("lou");

        assertThat(items).singleElement().satisfies(i -> {
            assertThat(i.kind()).isEqualTo("youtube");
            assertThat(i.url()).isEqualTo("https://www.youtube.com/shorts/abcDEF12345");
            assertThat(i.image()).isEqualTo("https://i.ytimg.com/vi/abcDEF12345/hqdefault.jpg");
            assertThat(i.sourceLabel()).isEqualTo("@MaChaine");
        });
    }

    private static final String SEARCH_PAGE = """
            <html><script>var ytInitialData = {"contents":{"sectionListRenderer":{"contents":[{"itemSectionRenderer":{"contents":[
              {"channelRenderer":{"channelId":"UCabcdefghijklmnopqrstuv","title":{"simpleText":"Ma Chaîne"},
                "navigationEndpoint":{"browseEndpoint":{"canonicalBaseUrl":"/@MaChaine"}},
                "thumbnail":{"thumbnails":[{"url":"//yt3.ggpht.com/small"},{"url":"//yt3.ggpht.com/big"}]},
                "subscriberCountText":{"simpleText":"@MaChaine"},"videoCountText":{"simpleText":"1,2 M d'abonnés"}}},
              {"videoRenderer":{"videoId":"x"}}]}}]}}};</script></html>""";

    @Test
    void searchingYoutubeListsChannelsOnceThenRemembers() {
        when(fetcher.fetch(any(URI.class), anyInt(), eq("text/html"), anyString(), anyString())).thenReturn(body(SEARCH_PAGE, "text/html"));

        var hits = service.searchYoutube("  ma   chaîne ");
        service.searchYoutube("Ma Chaîne");

        assertThat(hits).singleElement().satisfies(c -> {
            assertThat(c.id()).isEqualTo("UCabcdefghijklmnopqrstuv");
            assertThat(c.title()).isEqualTo("Ma Chaîne");
            assertThat(c.handle()).isEqualTo("@MaChaine");
            assertThat(c.image()).isEqualTo("https://yt3.ggpht.com/big");
            assertThat(c.subscribers()).isEqualTo("1,2 M d'abonnés");
        });
        ArgumentCaptor<URI> asked = ArgumentCaptor.forClass(URI.class);
        verify(fetcher, times(1)).fetch(asked.capture(), anyInt(), anyString(), anyString(), anyString());
        assertThat(asked.getValue().toString()).startsWith("https://www.youtube.com/results?search_query=ma+cha%C3%AEne");

        // its picture may now be shown, and only because it was in a search
        when(fetcher.fetch(eq(URI.create("https://yt3.ggpht.com/big")), anyInt(), anyString(), anyString())).thenReturn(body("png", "image/png"));
        assertThat(service.image("https://yt3.ggpht.com/big")).isPresent();
        assertThatThrownBy(() -> service.searchYoutube("a")).isInstanceOf(ContentValidationException.class);
    }

    @Test
    void aChannelPickedFromSearchKeepsItsName() {
        NewsPrefsDto saved = service.savePrefs("lou", new NewsPrefsDto(true, List.of(), List.of(
                new Follow("youtube", "UCabcdefghijklmnopqrstuv", "Ma <b>Chaîne</b>"))));
        assertThat(saved.follows()).singleElement().satisfies(f -> {
            assertThat(f.handle()).isEqualTo("UCabcdefghijklmnopqrstuv");
            assertThat(f.label()).isEqualTo("Ma Chaîne");
        });
    }

    @Test
    void aSourceThatAnswersNothingIsListedAsFailing() {
        when(profiles.newsPrefs("lou")).thenReturn(new NewsPrefsDto(true, List.of(), List.of(new Follow("reddit", "pcgaming"))));
        when(fetcher.fetch(any(URI.class), anyInt(), anyString(), anyString())).thenReturn(Optional.empty());

        service.items("lou");

        assertThat(service.failing("lou")).containsExactly("r/pcgaming");
    }

    @Test
    void myRedditHomeLinkIsSealedAndNeverShownBack() {
        User lou = new User("lou", "h", "Lou");
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));

        String account = service.saveRedditHome("lou", " https://old.reddit.com/.rss?feed=0123456789abcdef&user=LouR ");

        assertThat(account).isEqualTo("LouR");
        assertThat(lou.getNewsRedditFeed()).doesNotContain("0123456789abcdef").isNotBlank();
        assertThat(box.open(lou.getNewsRedditFeed())).contains("https://www.reddit.com/.rss?feed=0123456789abcdef&user=LouR");
        assertThat(service.redditHomeUser("lou")).contains("LouR");
    }

    @Test
    void myRedditHomeIsReadWithMyOtherSources() {
        User lou = new User("lou", "h", "Lou");
        lou.setNewsRedditFeed(box.seal("https://www.reddit.com/.rss?feed=0123456789abcdef&user=LouR"));
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(profiles.newsPrefs("lou")).thenReturn(new NewsPrefsDto(true, List.of(), List.of()));
        when(fetcher.fetch(eq(URI.create("https://www.reddit.com/.rss?feed=0123456789abcdef&user=LouR")), anyInt(), anyString(), anyString()))
                .thenReturn(body(RSS, "application/atom+xml"));

        assertThat(service.items("lou")).extracting(i -> i.sourceLabel()).containsOnly("Reddit · mon fil");
    }

    @Test
    void aWrongRedditLinkIsRefused() {
        assertThatThrownBy(() -> service.saveRedditHome("lou", "https://www.reddit.com/r/pcgaming"))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.saveRedditHome("lou", "https://evil.example/.rss?feed=0123456789abcdef&user=LouR"))
                .isInstanceOf(ContentValidationException.class);
    }

    private static Optional<PageFetcher.Fetched> body(String s, String type) {
        return Optional.of(new PageFetcher.Fetched(URI.create("https://x"), type, s.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void nothingIsOnUntilIChooseIt() {
        when(profiles.newsPrefs("lou")).thenReturn(null);

        assertThat(service.prefs("lou").enabled()).isFalse();
        assertThat(service.items("lou")).isEmpty();
        verify(fetcher, never()).fetch(any(), anyInt(), anyString(), anyString());
    }

    @Test
    void aSwitchedOffTabReadsNothingEvenWithSources() {
        when(profiles.newsPrefs("lou")).thenReturn(new NewsPrefsDto(false, List.of("korben"), List.of()));

        assertThat(service.items("lou")).isEmpty();
        verify(fetcher, never()).fetch(any(), anyInt(), anyString(), anyString());
    }

    @Test
    void savesCleanChoicesAndRefusesUnknownOnes() {
        NewsPrefsDto saved = service.savePrefs("lou", new NewsPrefsDto(true, List.of("korben", "korben", "numerama"), List.of(
                new Follow("bluesky", "@korben.info"),
                new Follow("mastodon", "@Gargron@Mastodon.Social"),
                new Follow("reddit", "r/pcgaming"),
                new Follow("xpost", "https://twitter.com/korben/status/1790?s=20"),
                new Follow("reddit", "pcgaming"))));

        assertThat(saved.enabled()).isTrue();
        assertThat(saved.sources()).containsExactly("korben", "numerama");
        assertThat(saved.follows()).containsExactly(
                new Follow("bluesky", "korben.info"),
                new Follow("mastodon", "Gargron@mastodon.social"),
                new Follow("reddit", "pcgaming"),
                new Follow("xpost", "https://x.com/korben/status/1790"));
        verify(profiles).updateNews("lou", saved);

        assertThatThrownBy(() -> service.savePrefs("lou", new NewsPrefsDto(true, List.of("pub-site"), List.of())))
                .isInstanceOf(ContentValidationException.class);
        for (Follow bad : List.of(new Follow("mastodon", "gargron@localhost"), new Follow("bluesky", "a/../b"),
                new Follow("xpost", "https://evil.com/korben/status/1"), new Follow("tiktok", "x"), new Follow("reddit", "a b"))) {
            assertThatThrownBy(() -> service.savePrefs("lou", new NewsPrefsDto(true, List.of(), List.of(bad))))
                    .as(bad.toString()).isInstanceOf(ContentValidationException.class);
        }
    }

    @Test
    void readsMySourcesNewestFirstAndKeepsThemAWhile() {
        when(profiles.newsPrefs("lou")).thenReturn(new NewsPrefsDto(true, List.of("korben"), List.of(new Follow("reddit", "pcgaming"))));
        when(fetcher.fetch(eq(URI.create("https://korben.info/feed")), anyInt(), anyString(), anyString())).thenReturn(body(RSS, "application/rss+xml"));
        when(fetcher.fetch(eq(URI.create("https://www.reddit.com/r/pcgaming/.rss")), anyInt(), anyString(), anyString())).thenReturn(Optional.empty());

        var items = service.items("lou");

        assertThat(items).extracting(i -> i.title()).containsExactly("Récent", "Ancien");
        assertThat(items.get(0).sourceLabel()).isEqualTo("Korben");
        assertThat(items.get(0).kind()).isEqualTo("site");
        service.items("lou"); // within 20 minutes: from the cache
        verify(fetcher, times(1)).fetch(eq(URI.create("https://korben.info/feed")), anyInt(), anyString(), anyString());
    }

    @Test
    void servesOnlyPicturesOfItemsItRead() {
        when(profiles.newsPrefs("lou")).thenReturn(new NewsPrefsDto(true, List.of("korben"), List.of()));
        when(fetcher.fetch(eq(URI.create("https://korben.info/feed")), anyInt(), anyString(), anyString())).thenReturn(body(RSS, "application/rss+xml"));
        service.items("lou");
        when(fetcher.fetch(eq(URI.create("https://korben.info/a.jpg")), anyInt(), anyString(), anyString())).thenReturn(body("jpg", "image/jpeg"));

        assertThat(service.image("https://korben.info/a.jpg")).isPresent();
        assertThat(service.image("http://169.254.169.254/latest/meta-data")).isEmpty();
        ArgumentCaptor<URI> asked = ArgumentCaptor.forClass(URI.class);
        verify(fetcher, times(2)).fetch(asked.capture(), anyInt(), anyString(), anyString());
        assertThat(asked.getAllValues()).noneMatch(u -> u.getHost().startsWith("169.254"));
    }

    @Test
    void keepsPicturesWithinTheMemoryBudget() {
        URI small = URI.create("https://korben.info/a.jpg");
        when(profiles.newsPrefs("lou")).thenReturn(new NewsPrefsDto(true, List.of("korben"), List.of()));
        when(fetcher.fetch(eq(URI.create("https://korben.info/feed")), anyInt(), anyString(), anyString())).thenReturn(body(RSS, "application/rss+xml"));
        service.items("lou");
        when(fetcher.fetch(eq(small), anyInt(), anyString(), anyString())).thenReturn(body("jpg", "image/jpeg"));

        service.image(small.toString());
        service.image(small.toString());
        verify(fetcher, times(1)).fetch(eq(small), anyInt(), anyString(), anyString());
    }

    @Test
    void doesNotKeepAPictureBeyondTheMemoryBudget() {
        URI huge = URI.create("https://korben.info/a.jpg");
        when(profiles.newsPrefs("lou")).thenReturn(new NewsPrefsDto(true, List.of("korben"), List.of()));
        when(fetcher.fetch(eq(URI.create("https://korben.info/feed")), anyInt(), anyString(), anyString())).thenReturn(body(RSS, "application/rss+xml"));
        service.items("lou");
        byte[] tooBig = new byte[(int) NewsService.MAX_KEPT_IMAGE_BYTES + 1];
        when(fetcher.fetch(eq(huge), anyInt(), anyString(), anyString()))
                .thenReturn(Optional.of(new PageFetcher.Fetched(huge, "image/jpeg", tooBig)));

        assertThat(service.image(huge.toString())).isPresent();
        service.image(huge.toString());
        verify(fetcher, times(2)).fetch(eq(huge), anyInt(), anyString(), anyString());
    }

    @Test
    void myOwnSitesAreCleanedAndRiskyAddressesRefused() {
        NewsPrefsDto saved = service.savePrefs("lou", new NewsPrefsDto(true, List.of(), List.of(
                new Follow("rss", "Korben.INFO"),
                new Follow("rss", "http://blog.example.fr/feed/"),
                new Follow("rss", "https://www.frandroid.com/feed"))));

        assertThat(saved.follows()).extracting(Follow::handle).containsExactly(
                "https://korben.info", "http://blog.example.fr/feed/", "https://www.frandroid.com/feed");
        for (String bad : List.of("localhost", "javascript:alert(1)", "ftp://x.fr/f", "https://a.b/<script>", "file:///etc/passwd")) {
            assertThatThrownBy(() -> service.savePrefs("lou", new NewsPrefsDto(true, List.of(), List.of(new Follow("rss", bad)))))
                    .as(bad).isInstanceOf(ContentValidationException.class);
        }
    }

    @Test
    void aSitePageLeadsToTheFeedItAnnounces() {
        when(profiles.newsPrefs("lou")).thenReturn(new NewsPrefsDto(true, List.of(), List.of(new Follow("rss", "https://blog.example.fr"))));
        String page = "<html><head><link rel=\"alternate\" type=\"application/rss+xml\" href=\"/feed.xml\"></head></html>";
        when(fetcher.fetch(eq(URI.create("https://blog.example.fr")), anyInt(), anyString(), anyString()))
                .thenReturn(Optional.of(new PageFetcher.Fetched(URI.create("https://blog.example.fr/"), "text/html; charset=utf-8", page.getBytes(StandardCharsets.UTF_8))));
        when(fetcher.fetch(eq(URI.create("https://blog.example.fr/feed.xml")), anyInt(), anyString(), anyString()))
                .thenReturn(body(RSS, "application/rss+xml"));

        var items = service.items("lou");

        assertThat(items).hasSize(2);
        assertThat(items.get(0).sourceLabel()).isEqualTo("blog.example.fr");
        assertThat(items.get(0).kind()).isEqualTo("site");
    }
}
