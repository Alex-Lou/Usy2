package com.memocat.feed.dto;

import com.memocat.auth.dto.UserDto;

import java.time.Instant;
import java.util.List;

public record PostDto(
        Long id,
        UserDto author,
        String text,
        Long imageAssetId,
        String imageEffect,
        Instant createdAt,
        Instant updatedAt,
        boolean edited,
        List<ReactionSummaryDto> reactions,
        long commentCount) {
}
