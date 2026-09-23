package com.memocat.chat.dto;

import com.memocat.domain.MessageReaction;

/** Who reacted to a message, with which emoji. */
public record MessageReactionDto(Long userId, String emoji) {

    public static MessageReactionDto from(MessageReaction r) {
        return new MessageReactionDto(r.getUserId(), r.getEmoji());
    }
}
