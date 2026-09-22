package com.memocat.asset.dto;

import com.memocat.domain.Asset;

public record AssetDto(Long id, String contentType, long sizeBytes, String originalFilename) {

    public static AssetDto from(Asset asset) {
        return new AssetDto(asset.getId(), asset.getContentType(),
                asset.getSizeBytes(), asset.getOriginalFilename());
    }
}
