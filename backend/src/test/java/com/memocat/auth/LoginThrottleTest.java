package com.memocat.auth;

import com.memocat.web.TooSoonException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoginThrottleTest {

    private Instant now = Instant.parse("2026-09-25T10:00:00Z");
    private final LoginThrottle throttle = new LoginThrottle(new Clock() {
        @Override
        public ZoneOffset getZone() {
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
    });

    private void fail(int times) {
        for (int i = 0; i < times; i++) {
            throttle.failed("lou");
        }
    }

    @Test
    void aFewTyposDoNotLock() {
        fail(LoginThrottle.MAX_FAILURES - 1);
        assertThatCode(() -> throttle.check("lou")).doesNotThrowAnyException();
    }

    @Test
    void locksAfterTooManyFailuresThenReopens() {
        fail(LoginThrottle.MAX_FAILURES);
        assertThatThrownBy(() -> throttle.check("lou")).isInstanceOf(TooSoonException.class);
        assertThatCode(() -> throttle.check("sam")).doesNotThrowAnyException();

        now = now.plus(LoginThrottle.LOCK);
        assertThatCode(() -> throttle.check("lou")).doesNotThrowAnyException();
        fail(1);
        assertThatCode(() -> throttle.check("lou")).doesNotThrowAnyException();
    }

    @Test
    void failuresFarApartDoNotAddUp() {
        fail(LoginThrottle.MAX_FAILURES - 1);
        now = now.plus(LoginThrottle.WINDOW).plus(Duration.ofSeconds(1));
        fail(1);
        assertThatCode(() -> throttle.check("lou")).doesNotThrowAnyException();
    }

    @Test
    void aSuccessClearsTheCount() {
        fail(LoginThrottle.MAX_FAILURES - 1);
        throttle.succeeded("lou");
        fail(1);
        assertThatCode(() -> throttle.check("lou")).doesNotThrowAnyException();
    }
}
