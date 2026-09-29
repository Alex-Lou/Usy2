package com.memocat.chat.dto;

import java.time.Instant;

/** Broadcast on /topic/chat-read: {@code readerId} has seen the other one's messages up to {@code upToId}. */
public record ChatReadDto(Long readerId, Long upToId, Instant readAt) {
}
