package com.memocat.challenge;

import com.memocat.domain.PhotoChallengeEntry;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class ChallengeDtos {

    private ChallengeDtos() {
    }

    public record EntryDto(Long id, Long authorId, String authorName, Long assetId, String caption, Instant createdAt) {
        static EntryDto from(PhotoChallengeEntry e) {
            return new EntryDto(e.getId(), e.getAuthor().getId(), e.getAuthor().getDisplayName(), e.getAsset().getId(),
                    e.getCaption(), e.getCreatedAt());
        }
    }

    /**
     * This week: the theme (and who chose it, null for the app), my photo, and the
     * other one's: {@code theirs} stays null until I posted mine ({@code theirsPosted} says it is there).
     */
    public record WeekDto(LocalDate weekStart, String theme, String themeBy, boolean jokerAvailable,
                          EntryDto mine, boolean theirsPosted, EntryDto theirs) {
    }

    /** A past week, both photos shown. */
    public record PastWeekDto(LocalDate weekStart, String theme, List<EntryDto> entries) {
    }
}
