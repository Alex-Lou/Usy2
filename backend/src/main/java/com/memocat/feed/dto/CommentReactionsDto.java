package com.memocat.feed.dto;

import java.util.List;

/** The reactions of a comment after a change (oldest first). */
public record CommentReactionsDto(Long commentId, List<CommentReactionDto> reactions) {
}
