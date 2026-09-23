package com.memocat.asset.dto;

import com.memocat.domain.Asset;

/** {@code effect}: animated effect of a studio photo, or null. */
public record AssetDto(Long id, String contentType, long sizeBytes, String originalFilename, String effect) {

    public static AssetDto from(Asset asset) {
        return new AssetDto(asset.getId(), asset.getContentType(),
                asset.getSizeBytes(), asset.getOriginalFilename(), asset.getEffect());
    }
}
