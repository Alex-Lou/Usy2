package com.memocat.album.dto;

import com.memocat.auth.dto.UserDto;

import java.time.Instant;

public record PhotoDto(
        Long id,
        Long assetId,
        String caption,
        int position,
        UserDto uploader,
        Instant createdAt) {
}
