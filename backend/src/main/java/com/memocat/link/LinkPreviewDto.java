package com.memocat.link;

/** What the app shows under a link. Every field may be null when the site says nothing. */
public record LinkPreviewDto(String url, String title, String description, String siteName, boolean hasImage) {
}
