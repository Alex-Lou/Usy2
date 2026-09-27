package com.memocat.feed.dto;

import com.memocat.domain.CommentReaction;

/** Who reacted to a comment, with which emoji. */
public record CommentReactionDto(Long userId, String emoji) {

    public static CommentReactionDto from(CommentReaction r) {
        return new CommentReactionDto(r.getUserId(), r.getEmoji());
    }
}
