package com.memocat.export;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Single-use download links for the export: a browser follows a plain link
 * (no Authorization header), so the logged-in user first gets a random token,
 * valid a few minutes and only once. Kept in memory: a restart just voids them.
 */
@Component
public class ExportTokens {

    static final Duration VALID_FOR = Duration.ofMinutes(5);

    private record Entry(String username, Instant expiresAt) {
    }

    private final Map<String, Entry> tokens = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;

    public ExportTokens() {
        this(Clock.systemUTC());
    }

    ExportTokens(Clock clock) {
        this.clock = clock;
    }

    public String issue(String username) {
        Instant now = clock.instant();
        tokens.values().removeIf(e -> now.isAfter(e.expiresAt())); // forget the stale ones
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.put(token, new Entry(username, now.plus(VALID_FOR)));
        return token;
    }

    /** The user the token was issued to, if it is valid; it is used up either way. */
    public Optional<String> redeem(String token) {
        Entry e = token == null ? null : tokens.remove(token);
        return e == null || clock.instant().isAfter(e.expiresAt()) ? Optional.empty() : Optional.of(e.username());
    }
}
