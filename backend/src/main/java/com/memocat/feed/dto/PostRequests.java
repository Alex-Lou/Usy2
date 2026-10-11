package com.memocat.feed.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Request payloads for the feed. Text content is length-checked in the service
 * (fail fast with a clear message). Photos: {@code imageAssetIds}, in order (up to 10); an app of
 * before the carousels sends a single {@code imageAssetId} instead.
 */
public final class PostRequests {

    public record CreatePost(String text, Long imageAssetId, List<Long> imageAssetIds) {
    }

    public record UpdatePost(String text, Long imageAssetId, List<Long> imageAssetIds) {
    }

    /**
     * {@code parentId}: the comment it answers (a reply to a reply joins the same thread), or null;
     * {@code imageAssetId}: a photo or GIF, or null.
     */
    public record CreateComment(String text, Long parentId, Long imageAssetId) {
    }

    public record Reaction(@NotNull String emoji) {
    }

    private PostRequests() {
    }
}
