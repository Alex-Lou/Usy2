package com.memocat.hidden;

import com.memocat.domain.HiddenNote;

import java.time.Instant;

/** {@code text} is null for the other one's note until it is found (only the 🐾 shows). */
public record HiddenNoteDto(Long id, boolean mine, String authorName, String text, Instant createdAt, Instant foundAt) {

    static HiddenNoteDto of(HiddenNote n, Long viewerId) {
        boolean mine = n.getAuthor().getId().equals(viewerId);
        return new HiddenNoteDto(n.getId(), mine, n.getAuthor().getDisplayName(),
                mine || n.getFoundAt() != null ? n.getText() : null, n.getCreatedAt(), n.getFoundAt());
    }
}
