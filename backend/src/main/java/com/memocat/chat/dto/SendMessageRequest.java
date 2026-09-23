package com.memocat.chat.dto;

/**
 * {@code attachmentAssetId}: a file the sender uploaded first (optional);
 * {@code replyToId}: the earlier message this one answers (optional).
 */
public record SendMessageRequest(String content, Long attachmentAssetId, Long replyToId) {
}
