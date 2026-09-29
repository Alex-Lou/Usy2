package com.memocat.couple;

import java.time.LocalDate;
import java.time.LocalTime;

/** Someone put a new date on the shared calendar: the other person gets a push. */
public record EventAdded(Long eventId, Long actorId, String actorName, String title, String emoji,
                         LocalDate day, LocalTime time) {
}
