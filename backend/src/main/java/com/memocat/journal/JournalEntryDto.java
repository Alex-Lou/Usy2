package com.memocat.journal;

import com.memocat.domain.JournalEntry;

import java.time.Instant;
import java.time.LocalDate;

public record JournalEntryDto(Long id, LocalDate day, Long authorId, String authorName, String text, Instant updatedAt) {

    static JournalEntryDto from(JournalEntry e) {
        return new JournalEntryDto(e.getId(), e.getDay(), e.getAuthor().getId(), e.getAuthor().getDisplayName(),
                e.getText(), e.getUpdatedAt());
    }
}
