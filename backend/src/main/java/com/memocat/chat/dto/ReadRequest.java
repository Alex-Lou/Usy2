package com.memocat.chat.dto;

/** Sent on /app/chat.read: the newest message seen on screen. */
public record ReadRequest(Long upToId) {
}
