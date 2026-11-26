package com.memocat.push;

import org.junit.jupiter.api.Test;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import static org.assertj.core.api.Assertions.assertThat;

class PresenceRegistryTest {

    private final PresenceRegistry registry = new PresenceRegistry();

    @Test
    void lookingOnlyWhileSomeSessionIsVisible() {
        assertThat(registry.isLookingAtApp("lou")).isFalse(); // never reported

        registry.report("s1", "lou", true);
        registry.report("s2", "lou", false);
        assertThat(registry.isLookingAtApp("lou")).isTrue();
        assertThat(registry.isLookingAtApp("sam")).isFalse();

        registry.report("s1", "lou", false); // app went to background
        assertThat(registry.isLookingAtApp("lou")).isFalse();
    }

    @Test
    void disconnectForgetsTheSession() {
        registry.report("s1", "lou", true);
        registry.onDisconnect(new SessionDisconnectEvent(this, MessageBuilder.withPayload(new byte[0]).build(),
                "s1", CloseStatus.NORMAL));
        assertThat(registry.isLookingAtApp("lou")).isFalse();
    }

    @Test
    void aVisiblePageThatStopsSayingSoNoLongerCounts() {
        java.time.Instant[] now = {java.time.Instant.parse("2026-11-26T10:00:00Z")};
        java.time.Clock moving = new java.time.Clock() {
            @Override public java.time.ZoneId getZone() { return java.time.ZoneOffset.UTC; }
            @Override public java.time.Clock withZone(java.time.ZoneId zone) { return this; }
            @Override public java.time.Instant instant() { return now[0]; }
        };
        PresenceRegistry timed = new PresenceRegistry(moving);
        timed.report("phone", "lou", true);
        now[0] = now[0].plusSeconds(20);
        timed.report("phone", "lou", true); // still looked at: said again
        now[0] = now[0].plusSeconds(40);
        assertThat(timed.isLookingAtApp("lou")).isTrue();

        now[0] = now[0].plusSeconds(10); // frozen in the background: nothing for 50 s
        assertThat(timed.isLookingAtApp("lou")).isFalse();
        assertThat(timed.isConnected("lou")).isTrue(); // still connected, just not looked at
    }

    @Test
    void theFirstReportOfAConnectionSaysTheAppJustOpened() {
        PresenceRegistry fresh = new PresenceRegistry();
        org.assertj.core.api.Assertions.assertThat(fresh.report("s9", "sam", false)).isTrue();
        org.assertj.core.api.Assertions.assertThat(fresh.report("s9", "sam", true)).isFalse();
        org.assertj.core.api.Assertions.assertThat(fresh.isConnected("sam")).isTrue();
        org.assertj.core.api.Assertions.assertThat(fresh.isConnected("lou")).isFalse();
    }
}
