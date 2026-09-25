package com.memocat.chat;

import com.memocat.chat.dto.MessageReactionDto;

import java.util.List;

/**
 * The reactions of a message changed. Broadcast on /topic/message-reactions
 * after commit (see MessageReactionBroadcaster), and returned to the caller.
 */
public record MessageReactionsChanged(Long messageId, List<MessageReactionDto> reactions) {
}
