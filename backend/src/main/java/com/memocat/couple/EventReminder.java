package com.memocat.couple;

import java.time.LocalTime;

/** An event on the shared calendar is tomorrow: both people get a push. */
public record EventReminder(Long eventId, String title, String emoji, LocalTime time) {
}
