package com.memocat.feed.dto;

public record ReactionSummaryDto(String emoji, long count, boolean reactedByMe) {
}
