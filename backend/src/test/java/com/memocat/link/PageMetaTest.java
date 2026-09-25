package com.memocat.link;

import org.junit.jupiter.api.Test;

import java.net.URI;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class PageMetaTest {

    private static final URI BASE = URI.create("https://news.example/articles/42");

    private static PageMeta parse(String html) {
        return PageMeta.parse(html.getBytes(StandardCharsets.UTF_8), "text/html; charset=utf-8", BASE);
    }

    @Test
    void readsOpenGraphTags() {
        PageMeta m = parse("""
                <html><head>
                <title>Fallback</title>
                <meta property="og:title" content="Le vrai titre">
                <meta property="og:description" content="Un résumé de l'article">
                <meta property="og:site_name" content="News">
                <meta property="og:image" content="/img/cover.jpg">
                </head><body></body></html>""");
        assertThat(m.title()).isEqualTo("Le vrai titre");
        assertThat(m.description()).isEqualTo("Un résumé de l'article");
        assertThat(m.siteName()).isEqualTo("News");
        assertThat(m.image()).isEqualTo(URI.create("https://news.example/img/cover.jpg"));
    }

    @Test
    void fallsBackToTitleAndMetaDescription() {
        PageMeta m = parse("""
                <html><head><title> Une page  simple </title>
                <meta name="description" content="Description classique">
                </head></html>""");
        assertThat(m.title()).isEqualTo("Une page simple");
        assertThat(m.description()).isEqualTo("Description classique");
        assertThat(m.image()).isNull();
    }

    @Test
    void cutsVeryLongFields() {
        PageMeta m = parse("<title>" + "x".repeat(1000) + "</title>");
        assertThat(m.title().length()).isLessThanOrEqualTo(300);
    }

    @Test
    void keepsMarkupAsPlainText() {
        PageMeta m = parse("<meta property=\"og:title\" content=\"&lt;script&gt;alert(1)&lt;/script&gt;\">");
        assertThat(m.title()).isEqualTo("<script>alert(1)</script>"); // rendered as text by React, never as HTML
    }

    @Test
    void ignoresNonHttpImages() {
        PageMeta m = parse("<meta property=\"og:image\" content=\"javascript:alert(1)\">");
        assertThat(m.image()).isNull();
    }

    @Test
    void detectsHtml() {
        assertThat(PageMeta.isHtml("text/html; charset=utf-8")).isTrue();
        assertThat(PageMeta.isHtml("application/xhtml+xml")).isTrue();
        assertThat(PageMeta.isHtml("application/pdf")).isFalse();
        assertThat(PageMeta.isHtml(null)).isFalse();
    }
}
