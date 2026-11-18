package com.memocat.chat.dto;

import com.memocat.domain.Message;
import com.memocat.push.Previews;

/**
 * The quoted message shown above a reply: who wrote it and a short excerpt.
 * {@code attachment} is "image", "audio", "file" or null.
 */
public record ReplyPreviewDto(Long id, Long senderId, String senderName, String excerpt, String attachment) {

    static final int MAX_EXCERPT = 140;

    public static ReplyPreviewDto from(Message m) {
        // One line, never cut inside an emoji, a sticker in words (as in a notification).
        String shortened = Previews.shorten(m.getContent(), MAX_EXCERPT);
        String excerpt = shortened == null ? "" : shortened;
        String type = m.getAttachment() == null ? null : m.getAttachment().getContentType();
        String attachment = type == null ? null
                : type.startsWith("image/") ? "image" : type.startsWith("audio/") ? "audio" : "file";
        return new ReplyPreviewDto(m.getId(), m.getSender().getId(), m.getSender().getDisplayName(), excerpt, attachment);
    }
}
