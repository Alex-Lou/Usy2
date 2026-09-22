package com.memocat.album.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/** Request payloads for albums and photos. Lengths are checked in the service. */
public final class AlbumRequests {

    public record CreateAlbum(String title, String description) {
    }

    public record UpdateAlbum(String title, String description) {
    }

    public record AddPhoto(@NotNull Long assetId, String caption) {
    }

    public record UpdatePhoto(String caption) {
    }

    public record ReorderPhotos(@NotNull List<Long> photoIds) {
    }

    private AlbumRequests() {
    }
}
