package com.memocat.couple.dto;

import java.time.Instant;

/**
 * A post or album photo from this day in an earlier year. {@code kind} is
 * "post" or "photo"; {@code albumId} is set for photos only.
 */
public record MemoryDto(String kind, Long id, int yearsAgo, Instant createdAt, String authorName,
                        String text, Long assetId, Long albumId) {
}
