package com.memocat.news;

import com.memocat.link.PageFetcher;
import com.memocat.profile.ProfileService;
import com.memocat.profile.dto.NewsPrefsDto;
import com.memocat.profile.dto.NewsPrefsDto.Follow;
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
    private NewsService service;

    private static final String RSS = """
            <rss><channel>
              <item><title>Ancien</title><link>https://korben.info/a</link><pubDate>Mon, 22 Sep 2026 10:00:00 GMT</pubDate>
                <enclosure url="https://korben.info/a.jpg" type="image/jpeg"/></item>
              <item><title>Récent</title><link>https://korben.info/b</link><pubDate>Wed, 24 Sep 2026 10:00:00 GMT</pubDate></item>
            </channel></rss>""";

    @BeforeEach
    void setUp() {
        service = new NewsService(profiles, fetcher, Clock.fixed(Instant.parse("2026-09-25T10:00:00Z"), ZoneOffset.UTC));
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
}
