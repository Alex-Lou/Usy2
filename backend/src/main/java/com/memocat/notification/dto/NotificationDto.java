package com.memocat.notification.dto;

import com.memocat.domain.Notification;

import java.time.Instant;

/**
 * A bell entry. {@code recipientId}: whose it is;
 * {@code tag}: what it is about (e.g. "post-8" for a new post, see PushNotifier).
 */
public record NotificationDto(Long id, Long recipientId, String text, String excerpt, String url, String tag,
                              boolean read, Instant createdAt) {

    public static NotificationDto from(Notification n) {
        return new NotificationDto(n.getId(), n.getRecipientId(), n.getText(), n.getExcerpt(), n.getUrl(), n.getTag(), n.isRead(),
                n.getCreatedAt());
    }
}
