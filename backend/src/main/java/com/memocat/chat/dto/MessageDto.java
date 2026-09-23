package com.memocat.chat.dto;

import com.memocat.asset.dto.AssetDto;
import com.memocat.auth.dto.UserDto;
import com.memocat.domain.Message;

import java.time.Instant;

/** A chat message; {@code attachment} is null for text-only messages. */
public record MessageDto(Long id, UserDto sender, String content, AssetDto attachment, Instant createdAt) {

    public static MessageDto from(Message message) {
        return new MessageDto(
                message.getId(),
                UserDto.from(message.getSender()),
                message.getContent(),
                message.getAttachment() == null ? null : AssetDto.from(message.getAttachment()),
                message.getCreatedAt());
    }
}
