package com.memocat.chat;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class TypingThrottleTest {

    @Test
    void atMostOnceASecondPerPerson() {
        Instant t0 = Instant.parse("2026-09-29T10:00:00Z");
        TypingThrottle early = new TypingThrottle(Clock.fixed(t0, ZoneOffset.UTC));
        assertThat(early.allow("lou")).isTrue();
        assertThat(early.allow("lou")).isFalse(); // same instant: dropped
        assertThat(early.allow("sam")).isTrue();  // someone else: independent
    }

    @Test
    void againAfterTheGap() {
        MutableClock clock = new MutableClock(Instant.parse("2026-09-29T10:00:00Z"));
        TypingThrottle throttle = new TypingThrottle(clock);
        assertThat(throttle.allow("lou")).isTrue();
        clock.now = clock.now.plus(TypingThrottle.MIN_GAP);
        assertThat(throttle.allow("lou")).isTrue();
    }

    private static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
