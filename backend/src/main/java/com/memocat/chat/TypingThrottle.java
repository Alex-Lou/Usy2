package com.memocat.chat;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** "… écrit" goes out at most once a second per person, whatever a client sends. */
@Component
public class TypingThrottle {

    static final Duration MIN_GAP = Duration.ofSeconds(1);

    private final Map<String, Instant> last = new ConcurrentHashMap<>();
    private final Clock clock;

    public TypingThrottle() {
        this(Clock.systemUTC());
    }

    TypingThrottle(Clock clock) {
        this.clock = clock;
    }

    public boolean allow(String username) {
        Instant now = clock.instant();
        boolean[] ok = {false};
        last.compute(username, (u, before) -> {
            ok[0] = before == null || !now.isBefore(before.plus(MIN_GAP));
            return ok[0] ? now : before;
        });
        return ok[0];
    }
}
