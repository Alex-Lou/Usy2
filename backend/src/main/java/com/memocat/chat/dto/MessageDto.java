package com.memocat.chat.dto;

import com.memocat.asset.dto.AssetDto;
import com.memocat.auth.dto.UserDto;
import com.memocat.domain.Message;

import java.time.Instant;
import java.util.List;

/**
 * A chat message; {@code attachment} is null for text-only messages,
 * {@code reactions} lists each person's emoji on it (oldest first),
 * {@code replyTo} quotes the message it answers (null when it answers none).
 */
public record MessageDto(Long id, UserDto sender, String content, AssetDto attachment, Instant createdAt,
                         List<MessageReactionDto> reactions, ReplyPreviewDto replyTo) {

    public static MessageDto from(Message message) {
        return from(message, List.of());
    }

    public static MessageDto from(Message message, List<MessageReactionDto> reactions) {
        return new MessageDto(
                message.getId(),
                UserDto.from(message.getSender()),
                message.getContent(),
                message.getAttachment() == null ? null : AssetDto.from(message.getAttachment()),
                message.getCreatedAt(),
                reactions,
                message.getReplyTo() == null ? null : ReplyPreviewDto.from(message.getReplyTo()));
    }
}
