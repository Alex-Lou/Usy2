package com.memocat.couple.dto;

import com.memocat.profile.dto.WidgetDto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Request bodies of the "Nous" API. Content rules are checked in the services. */
public final class CoupleRequests {

    private CoupleRequests() {
    }

    public record MoodRequest(String emoji, String label) {
    }

    /** {@code null} clears the date. */
    public record TogetherSinceRequest(LocalDate date) {
    }

    public record TextRequest(String text) {
    }

    public record NameRequest(String name) {
    }

    public record DoneRequest(boolean done) {
    }

    /** The whole shared widget list, edited from the copy at {@code version}. */
    public record WidgetsRequest(List<WidgetDto> widgets, Integer version) {
    }

    /** One widget added at the end of the shared list (e.g. shared from a profile). */
    public record AddWidgetRequest(WidgetDto widget) {
    }

    /** A date on the shared calendar; {@code time} null = all day. */
    public record EventRequest(String title, LocalDate date, LocalTime time, String emoji, String note,
                               boolean yearly) {
    }
}
