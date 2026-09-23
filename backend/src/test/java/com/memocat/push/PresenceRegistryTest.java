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
}
