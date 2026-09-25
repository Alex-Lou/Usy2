package com.memocat.security;

import com.memocat.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

/**
 * Issues and validates HS256 JWT access tokens. The token subject is the username.
 */
@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32; // 256 bits for HS256

    private final SecretKey key;
    private final long expirationMinutes;

    public JwtService(JwtProperties properties) {
        String secret = properties.getSecret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "memocat.jwt.secret must be set and at least " + MIN_SECRET_BYTES
                            + " characters long (set the MEMOCAT_JWT_SECRET environment variable).");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = properties.getExpirationMinutes();
    }

    /** Generates a signed token for the given username, returning the token and its expiry. */
    public IssuedToken generate(String username) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(expirationMinutes, ChronoUnit.MINUTES);
        String token = Jwts.builder()
                .subject(username)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
        return new IssuedToken(token, expiresAt);
    }

    /**
     * Validates the token signature and expiry.
     *
     * @return the subject (username) if the token is valid, empty otherwise.
     */
    public Optional<String> validateAndGetUsername(String token) {
        return verify(token).map(Verified::username);
    }

    /** Same check, also giving when the token was issued (to refuse revoked ones). */
    public Optional<Verified> verify(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            if (claims.getSubject() == null || claims.getIssuedAt() == null) {
                return Optional.empty();
            }
            return Optional.of(new Verified(claims.getSubject(), claims.getIssuedAt().toInstant()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public record Verified(String username, Instant issuedAt) {
    }

    public record IssuedToken(String token, Instant expiresAt) {
    }
}
