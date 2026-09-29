package com.memocat.notification.dto;

import com.memocat.domain.Notification;

import java.time.Instant;

/** A bell entry. {@code recipientId}: whose it is (the live topic is shared, each app keeps its own). */
public record NotificationDto(Long id, Long recipientId, String text, String excerpt, String url, boolean read,
                              Instant createdAt) {

    public static NotificationDto from(Notification n) {
        return new NotificationDto(n.getId(), n.getRecipientId(), n.getText(), n.getExcerpt(), n.getUrl(), n.isRead(),
                n.getCreatedAt());
    }
}
