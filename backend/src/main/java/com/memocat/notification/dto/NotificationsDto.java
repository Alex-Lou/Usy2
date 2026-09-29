package com.memocat.notification.dto;

import java.util.List;

/** The latest bell entries and how many are unread in all. */
public record NotificationsDto(List<NotificationDto> items, long unread) {
}
