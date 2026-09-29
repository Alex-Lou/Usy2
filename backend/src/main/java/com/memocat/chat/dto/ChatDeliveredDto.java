package com.memocat.chat.dto;

import java.time.Instant;

/** Broadcast on /topic/chat-delivered: the other one's messages up to {@code upToId} reached {@code receiverId}. */
public record ChatDeliveredDto(Long receiverId, Long upToId, Instant deliveredAt) {
}
