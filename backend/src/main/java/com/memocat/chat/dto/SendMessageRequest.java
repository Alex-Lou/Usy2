package com.memocat.chat.dto;

import java.util.List;

/**
 * {@code attachmentAssetIds}: up to 10 files the sender uploaded first, in order
 * (optional; {@code attachmentAssetId}: a single one, as older apps send it);
 * {@code replyToId}: the earlier message this one answers (optional);
 * {@code style} / {@code effect}: how it is sent (optional, see MessageLooks).
 */
public record SendMessageRequest(String content, Long attachmentAssetId, Long replyToId, String style, String effect,
                                 List<Long> attachmentAssetIds) {

    public SendMessageRequest(String content, Long attachmentAssetId, Long replyToId) {
        this(content, attachmentAssetId, replyToId, null, null, null);
    }

    public SendMessageRequest(String content, Long attachmentAssetId, Long replyToId, String style, String effect) {
        this(content, attachmentAssetId, replyToId, style, effect, null);
    }

    /** All the files, in order: the list, else the single one, else none. */
    public List<Long> files() {
        if (attachmentAssetIds != null && !attachmentAssetIds.isEmpty()) {
            return attachmentAssetIds;
        }
        return attachmentAssetId == null ? List.of() : List.of(attachmentAssetId);
    }
}
