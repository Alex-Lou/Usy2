package com.memocat.link;

import com.memocat.domain.LinkPreview;
import com.memocat.repository.LinkPreviewRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Previews of links (title, description, thumbnail), fetched once by the
 * server and cached, so phones never contact third-party sites and the same
 * link is not fetched again for a week.
 */
@Service
public class LinkPreviewService {

    static final Duration TTL = Duration.ofDays(7);
    /** A site that gave nothing (down, blocked, no tags) is asked again sooner. */
    static final Duration EMPTY_TTL = Duration.ofHours(1);
    // Thumbnails live in the (1 GB) database outside the upload quota: at most ~100 MB.
    static final int MAX_CACHED = 100;
    static final int MAX_PAGE = 512 * 1024;
    static final int MAX_IMAGE = 1024 * 1024;

    private final UrlSafety safety;
    private final PageFetcher fetcher;
    private final LinkPreviewRepository cache;

    public LinkPreviewService(UrlSafety safety, PageFetcher fetcher, LinkPreviewRepository cache) {
        this.safety = safety;
        this.fetcher = fetcher;
        this.cache = cache;
    }

    // No transaction here: fetching can take seconds and must not hold a DB connection.
    public LinkPreviewDto preview(String rawUrl) {
        URI uri = safety.check(rawUrl);
        String key = uri.toString();
        Optional<LinkPreview> cached = cache.findById(key);
        LinkPreview p = cached.filter(LinkPreviewService::isFresh)
                .orElseGet(() -> fetchAndStore(uri, key));
        return toDto(p);
    }

    /** The cached thumbnail of a link already previewed. */
    public Optional<LinkPreview> image(String rawUrl) {
        URI uri = safety.check(rawUrl);
        return cache.findById(uri.toString()).filter(p -> p.getImage() != null);
    }

    private static boolean isFresh(LinkPreview p) {
        boolean empty = p.getTitle() == null && p.getDescription() == null;
        return p.getFetchedAt().isAfter(Instant.now().minus(empty ? EMPTY_TTL : TTL));
    }

    private LinkPreview fetchAndStore(URI uri, String key) {
        PageMeta meta = fetcher.fetch(uri, MAX_PAGE, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5")
                .filter(f -> PageMeta.isHtml(f.contentType()))
                .map(f -> PageMeta.parse(f.body(), f.contentType(), f.finalUri()))
                .orElse(new PageMeta(null, null, null, null));

        byte[] image = null;
        String imageType = null;
        if (meta.image() != null) {
            try {
                Optional<PageFetcher.Fetched> img = fetcher.fetch(meta.image(), MAX_IMAGE + 1, "image/*");
                if (img.isPresent() && img.get().body().length <= MAX_IMAGE) {
                    imageType = ImageSniffer.type(img.get().body());
                    image = imageType == null ? null : img.get().body();
                }
            } catch (RuntimeException ignored) {
                // unsafe or broken image URL: preview without thumbnail
            }
        }
        LinkPreview p = new LinkPreview(key, meta.title(), meta.description(), meta.siteName(), image, imageType,
                Instant.now());
        try {
            cache.saveAndFlush(p);
            cache.trimTo(MAX_CACHED);
        } catch (DataIntegrityViolationException ignored) {
            // fetched twice at the same time: the other copy is just as good
        }
        return p;
    }

    private static LinkPreviewDto toDto(LinkPreview p) {
        return new LinkPreviewDto(p.getUrl(), p.getTitle(), p.getDescription(), p.getSiteName(), p.getImage() != null);
    }
}
