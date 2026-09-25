package com.memocat.auth;

import com.memocat.web.TooSoonException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Slows down password guessing: after {@link #MAX_FAILURES} wrong passwords
 * on an account within {@link #WINDOW}, that account refuses every login, even
 * with the right password, for {@link #LOCK}. Only existing accounts are
 * tracked, so memory stays bounded by the number of users. In memory: a
 * restart forgets the count, which only costs an attacker's lost time.
 */
@Component
public class LoginThrottle {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);
    static final Duration LOCK = Duration.ofMinutes(15);

    private record State(int failures, Instant since, Instant lockedUntil) {
    }

    private final Clock clock;
    private final Map<String, State> states = new ConcurrentHashMap<>();

    @Autowired
    public LoginThrottle() {
        this(Clock.systemUTC());
    }

    LoginThrottle(Clock clock) {
        this.clock = clock;
    }

    /** Throws (HTTP 429) while the account is locked. */
    public void check(String username) {
        State s = states.get(key(username));
        if (s != null && s.lockedUntil() != null && clock.instant().isBefore(s.lockedUntil())) {
            throw new TooSoonException("Trop d'essais : réessaie dans quelques minutes.");
        }
    }

    public void failed(String username) {
        Instant now = clock.instant();
        states.compute(key(username), (k, s) -> {
            boolean fresh = s == null
                    || (s.lockedUntil() == null ? now.isAfter(s.since().plus(WINDOW)) : !now.isBefore(s.lockedUntil()));
            if (fresh) {
                return new State(1, now, null);
            }
            int failures = s.failures() + 1;
            return new State(failures, s.since(), failures >= MAX_FAILURES ? now.plus(LOCK) : null);
        });
    }

    public void succeeded(String username) {
        states.remove(key(username));
    }

    private static String key(String username) {
        return username == null ? "" : username.toLowerCase(Locale.ROOT);
    }
}
