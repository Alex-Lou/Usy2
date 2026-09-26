package com.memocat.feed.dto;

import com.memocat.auth.dto.UserDto;

import java.time.Instant;
import java.util.List;

/**
 * A post comment; {@code reactions}: each person's emoji on it (oldest first);
 * {@code parentId}: the top-level comment it answers, or null.
 */
public record CommentDto(Long id, UserDto author, String text, Instant createdAt, List<CommentReactionDto> reactions,
                         Long parentId) {
}
