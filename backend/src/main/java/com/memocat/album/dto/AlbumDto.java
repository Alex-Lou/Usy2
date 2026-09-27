package com.memocat.album.dto;

import com.memocat.asset.Framing;
import com.memocat.auth.dto.UserDto;

import java.time.Instant;

public record AlbumDto(
        Long id,
        String title,
        String description,
        UserDto creator,
        Instant createdAt,
        long photoCount,
        Long coverAssetId,
        Framing coverFraming) {
}
