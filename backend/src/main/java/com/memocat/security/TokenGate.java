package com.memocat.security;

import com.memocat.domain.User;
import com.memocat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Decides whether a connection token still opens the app: valid signature and
 * expiry, and issued after the account last chose "log out all my devices".
 * That instant is cached per account (one lookup, then memory: the app runs as
 * a single server), so each request costs a map read.
 */
@Service
public class TokenGate {

    private final JwtService jwt;
    private final UserRepository users;
    private final Clock clock;
    private final Map<String, Optional<Instant>> validAfter = new ConcurrentHashMap<>();

    @Autowired
    public TokenGate(JwtService jwt, UserRepository users) {
        this(jwt, users, Clock.systemUTC());
    }

    TokenGate(JwtService jwt, UserRepository users, Clock clock) {
        this.jwt = jwt;
        this.users = users;
        this.clock = clock;
    }

    /** @return the username when the token is valid and not revoked. */
    public Optional<String> authenticate(String token) {
        return jwt.verify(token)
                .filter(v -> validAfter(v.username()).map(after -> !v.issuedAt().isBefore(after)).orElse(true))
                .map(JwtService.Verified::username);
    }

    /**
     * Refuses every token issued so far for this account, this device's too.
     * Tokens carry whole seconds, so the cut is the next second: a token issued
     * in the current one is refused as well.
     */
    @Transactional
    public void revokeAll(String username) {
        User user = users.findByUsername(username).orElseThrow();
        Instant cut = clock.instant().truncatedTo(ChronoUnit.SECONDS).plusSeconds(1);
        user.setTokensValidAfter(cut);
        users.save(user);
        validAfter.put(username, Optional.of(cut));
    }

    private Optional<Instant> validAfter(String username) {
        return validAfter.computeIfAbsent(username,
                u -> users.findByUsername(u).map(User::getTokensValidAfter));
    }
}
