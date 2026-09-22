package com.memocat.feed.dto;

import com.memocat.auth.dto.UserDto;

import java.time.Instant;

public record CommentDto(Long id, UserDto author, String text, Instant createdAt) {
}
