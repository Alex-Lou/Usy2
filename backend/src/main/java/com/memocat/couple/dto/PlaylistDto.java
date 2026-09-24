package com.memocat.couple.dto;

import java.time.Instant;
import java.util.List;

/** A shared playlist and its tracks, in order. */
public record PlaylistDto(Long id, String name, String emoji, Instant createdAt, List<TrackDto> tracks) {

    /** {@code url} is null for a song kept by name only. */
    public record TrackDto(Long id, String title, String artist, String url, String note, Long addedById,
                           Instant createdAt) {
    }
}
