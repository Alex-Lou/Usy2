package com.memocat.chat.dto;

/** Broadcast on /topic/chat-typing while someone types (never stored). */
public record TypingDto(Long userId, String name) {
}
