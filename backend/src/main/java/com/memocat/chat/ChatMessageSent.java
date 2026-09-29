package com.memocat.chat;

/**
 * A chat message was stored. Published as an application event for listeners
 * such as push notifications (which read its excerpt back by {@code messageId}).
 */
public record ChatMessageSent(Long senderId, String senderName, Long messageId) {
}
