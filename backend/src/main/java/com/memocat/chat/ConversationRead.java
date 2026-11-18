package com.memocat.chat;

/**
 * Someone read the other one's messages: their notifications about the
 * conversation are read too (see NotificationService). Handled in the same
 * transaction, before the "Vu" goes out.
 */
public record ConversationRead(Long readerId) {
}
