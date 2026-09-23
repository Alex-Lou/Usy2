package com.memocat.link;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** Link previews for posts and messages (signed-in users only, like all /api). */
@RestController
@RequestMapping("/api/link-preview")
public class LinkPreviewController {

    private final LinkPreviewService previews;

    public LinkPreviewController(LinkPreviewService previews) {
        this.previews = previews;
    }

    @GetMapping
    public ResponseEntity<LinkPreviewDto> preview(@RequestParam String url) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(12)).cachePrivate())
                .body(previews.preview(url));
    }

    @GetMapping("/image")
    public ResponseEntity<byte[]> image(@RequestParam String url) {
        return previews.image(url)
                .map(p -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(p.getImageType()))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePrivate())
                        .body(p.getImage()))
                .orElse(ResponseEntity.notFound().build());
    }
}
