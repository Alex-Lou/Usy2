package com.memocat.feed.dto;

import com.memocat.domain.Asset;

/**
 * A photo of a post or comment: its size (so its frame has the right shape before it loads), studio
 * effect, and type (image/gif or a photo, to save it under the right name).
 */
public record PhotoDto(Long assetId, Integer width, Integer height, String effect, String contentType) {

    public static PhotoDto from(Asset a) {
        return new PhotoDto(a.getId(), a.getWidth(), a.getHeight(), a.getEffect(), a.getContentType());
    }
}
