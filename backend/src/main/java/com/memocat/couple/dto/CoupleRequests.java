package com.memocat.couple.dto;

import java.time.LocalDate;

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
}
