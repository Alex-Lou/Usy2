package com.memocat.chat.dto;

import com.memocat.domain.Message;

/**
 * The quoted message shown above a reply: who wrote it and a short excerpt.
 * {@code attachment} is "image", "audio", "file" or null.
 */
public record ReplyPreviewDto(Long id, Long senderId, String senderName, String excerpt, String attachment) {

    static final int MAX_EXCERPT = 140;

    public static ReplyPreviewDto from(Message m) {
        String text = m.getContent() == null ? "" : m.getContent().strip();
        String excerpt = text.length() > MAX_EXCERPT ? text.substring(0, MAX_EXCERPT - 1) + "…" : text;
        String type = m.getAttachment() == null ? null : m.getAttachment().getContentType();
        String attachment = type == null ? null
                : type.startsWith("image/") ? "image" : type.startsWith("audio/") ? "audio" : "file";
        return new ReplyPreviewDto(m.getId(), m.getSender().getId(), m.getSender().getDisplayName(), excerpt, attachment);
    }
}
