package com.memocat.couple.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/** A date on the shared calendar; {@code time} is null for an all-day event. */
public record CoupleEventDto(Long id, String title, LocalDate date, LocalTime time, String emoji, String note,
                             boolean yearly, Long createdById, Instant createdAt) {
}
