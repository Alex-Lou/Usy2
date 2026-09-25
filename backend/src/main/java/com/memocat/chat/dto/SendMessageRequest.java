package com.memocat.chat.dto;

/**
 * {@code attachmentAssetId}: a file the sender uploaded first (optional);
 * {@code replyToId}: the earlier message this one answers (optional);
 * {@code style} / {@code effect}: how it is sent (optional, see MessageLooks).
 */
public record SendMessageRequest(String content, Long attachmentAssetId, Long replyToId, String style, String effect) {

    public SendMessageRequest(String content, Long attachmentAssetId, Long replyToId) {
        this(content, attachmentAssetId, replyToId, null, null);
    }
}
