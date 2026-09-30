package com.memocat.search;

import java.time.Instant;

/**
 * One search result. {@code kind}: message, post, comment, photo, album or note;
 * {@code link} is where the app opens it; {@code assetId} is a thumbnail when there is one.
 */
public record SearchHit(String kind, Long id, String text, Instant createdAt, String authorName,
                        Long assetId, String link) {
}
