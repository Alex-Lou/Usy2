package com.memocat.security;

import com.memocat.config.JwtProperties;
import com.memocat.domain.User;
import com.memocat.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TokenGateTest {

    private final JwtService jwt = jwt();
    private final UserRepository users = mock(UserRepository.class);
    private final User lou = new User("lou", "hash", "Lou");

    private static JwtService jwt() {
        JwtProperties props = new JwtProperties();
        props.setSecret("test-secret-test-secret-test-secret-42");
        return new JwtService(props);
    }

    private TokenGate gateAt(Instant now) {
        return new TokenGate(jwt, users, Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    void aValidTokenOpensUntilTheAccountLogsOutEverywhere() {
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        String token = jwt.generate("lou").token();
        TokenGate gate = gateAt(Instant.now());

        assertThat(gate.authenticate(token)).contains("lou");
        gate.revokeAll("lou");

        assertThat(gate.authenticate(token)).isEmpty();
        assertThat(lou.getTokensValidAfter()).isNotNull();
    }

    @Test
    void tokensIssuedAfterTheCutStillOpen() {
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        TokenGate gate = gateAt(Instant.now().minusSeconds(10));
        gate.revokeAll("lou");

        assertThat(gate.authenticate(jwt.generate("lou").token())).contains("lou");
    }

    @Test
    void theCutIsReadOnceThenKept() {
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        String token = jwt.generate("lou").token();
        TokenGate gate = gateAt(Instant.now());

        gate.authenticate(token);
        gate.authenticate(token);
        verify(users, times(1)).findByUsername("lou");
    }

    @Test
    void aBadTokenNeverOpens() {
        assertThat(gateAt(Instant.now()).authenticate("not-a-token")).isEmpty();
    }
}
