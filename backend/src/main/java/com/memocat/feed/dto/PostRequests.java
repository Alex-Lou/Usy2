package com.memocat.feed.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Request payloads for the feed. Text content is length-checked in the service
 * (fail fast with a clear message); imageAssetId is optional.
 */
public final class PostRequests {

    public record CreatePost(String text, Long imageAssetId) {
    }

    public record UpdatePost(String text, Long imageAssetId) {
    }

    /** {@code parentId}: the comment it answers (a reply to a reply joins the same thread), or null. */
    public record CreateComment(String text, Long parentId) {
    }

    public record Reaction(@NotNull String emoji) {
    }

    private PostRequests() {
    }
}
