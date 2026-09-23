package com.memocat.chat.dto;

/** {@code attachmentAssetId}: a file the sender uploaded first (optional). */
public record SendMessageRequest(String content, Long attachmentAssetId) {
}
