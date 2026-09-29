package com.memocat.asset.dto;

import com.memocat.domain.Asset;

/** {@code effect}: animated effect of a studio photo, or null. {@code width}/{@code height}: an image's size, or null. */
public record AssetDto(Long id, String contentType, long sizeBytes, String originalFilename, String effect,
                       Integer width, Integer height) {

    public static AssetDto from(Asset asset) {
        return new AssetDto(asset.getId(), asset.getContentType(),
                asset.getSizeBytes(), asset.getOriginalFilename(), asset.getEffect(),
                asset.getWidth(), asset.getHeight());
    }
}
