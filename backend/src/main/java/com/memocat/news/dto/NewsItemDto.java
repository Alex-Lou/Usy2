package com.memocat.news.dto;

import java.time.Instant;

/**
 * One article or post in the "Actus" tab. {@code source}: a catalog id or a
 * followed account ("bluesky:…"); {@code kind}: "site", "bluesky", "mastodon",
 * "reddit" or "x". Text is plain (markup stripped); {@code image} is the
 * original picture address, shown through GET /api/news/image.
 */
public record NewsItemDto(String source, String sourceLabel, String kind, String title, String text,
                          String url, String image, String author, Instant publishedAt) {
}
