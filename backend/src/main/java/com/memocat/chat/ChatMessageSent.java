package com.memocat.chat;

/**
 * A chat message was stored. Published as an application event for listeners
 * such as push notifications; deliberately carries no message content.
 */
public record ChatMessageSent(Long senderId, String senderName) {
}
