package com.memocat.link;

import com.memocat.domain.LinkPreview;
import com.memocat.repository.LinkPreviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LinkPreviewServiceTest {

    private static final URI PAGE = URI.create("https://news.example/a");
    private static final URI COVER = URI.create("https://news.example/cover.png");
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3};

    private final PageFetcher fetcher = mock(PageFetcher.class);
    private final LinkPreviewRepository cache = mock(LinkPreviewRepository.class);
    private LinkPreviewService service;

    @BeforeEach
    void setUp() {
        UrlSafety safety = new UrlSafety(host -> new InetAddress[]{InetAddress.getByName("93.184.216.34")});
        service = new LinkPreviewService(safety, fetcher, cache);
        when(cache.findById(anyString())).thenReturn(Optional.empty());
    }

    private void page(String html) {
        when(fetcher.fetch(eq(PAGE), anyInt(), anyString())).thenReturn(Optional.of(
                new PageFetcher.Fetched(PAGE, "text/html", html.getBytes(StandardCharsets.UTF_8))));
    }

    @Test
    void fetchesTitleDescriptionAndThumbnailThenCaches() {
        page("<meta property=og:title content=Titre><meta property=og:description content=Desc>"
                + "<meta property=og:image content=/cover.png>");
        when(fetcher.fetch(eq(COVER), anyInt(), anyString()))
                .thenReturn(Optional.of(new PageFetcher.Fetched(COVER, "image/png", PNG)));

        LinkPreviewDto dto = service.preview(PAGE.toString());

        assertThat(dto).isEqualTo(new LinkPreviewDto(PAGE.toString(), "Titre", "Desc", null, true));
        verify(cache).saveAndFlush(any(LinkPreview.class));
        verify(cache).trimTo(LinkPreviewService.MAX_CACHED);
    }

    @Test
    void dropsThumbnailThatIsNotARealImage() {
        page("<meta property=og:title content=T><meta property=og:image content=/cover.png>");
        when(fetcher.fetch(eq(COVER), anyInt(), anyString())).thenReturn(Optional.of(
                new PageFetcher.Fetched(COVER, "image/png", "<svg onload=alert(1)>".getBytes(StandardCharsets.UTF_8))));

        assertThat(service.preview(PAGE.toString()).hasImage()).isFalse();
    }

    @Test
    void unreachableSiteGivesAnEmptyPreviewThatIsCachedToo() {
        when(fetcher.fetch(any(), anyInt(), anyString())).thenReturn(Optional.empty());

        LinkPreviewDto dto = service.preview(PAGE.toString());

        assertThat(dto.title()).isNull();
        assertThat(dto.hasImage()).isFalse();
        verify(cache).saveAndFlush(any(LinkPreview.class));
    }

    @Test
    void freshCacheIsUsedWithoutFetching() {
        when(cache.findById(PAGE.toString())).thenReturn(Optional.of(
                new LinkPreview(PAGE.toString(), "Cache", null, null, null, null, Instant.now())));

        assertThat(service.preview(PAGE.toString()).title()).isEqualTo("Cache");
        verify(fetcher, never()).fetch(any(), anyInt(), anyString());
    }

    @Test
    void emptyPreviewIsRetriedAfterAnHour() {
        when(cache.findById(PAGE.toString())).thenReturn(Optional.of(new LinkPreview(PAGE.toString(), null,
                null, null, null, null, Instant.now().minus(LinkPreviewService.EMPTY_TTL).minus(Duration.ofMinutes(1)))));
        page("<title>Revenu</title>");

        assertThat(service.preview(PAGE.toString()).title()).isEqualTo("Revenu");
    }

    @Test
    void staleCacheIsRefetched() {
        when(cache.findById(PAGE.toString())).thenReturn(Optional.of(new LinkPreview(PAGE.toString(), "Vieux",
                null, null, null, null, Instant.now().minus(LinkPreviewService.TTL).minus(Duration.ofMinutes(1)))));
        page("<title>Neuf</title>");

        assertThat(service.preview(PAGE.toString()).title()).isEqualTo("Neuf");
    }
}
