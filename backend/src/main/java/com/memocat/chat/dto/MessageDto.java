package com.memocat.chat.dto;

import com.memocat.auth.dto.UserDto;
import com.memocat.domain.Message;

import java.time.Instant;

public record MessageDto(Long id, UserDto sender, String content, Instant createdAt) {

    public static MessageDto from(Message message) {
        return new MessageDto(
                message.getId(),
                UserDto.from(message.getSender()),
                message.getContent(),
                message.getCreatedAt());
    }
}
