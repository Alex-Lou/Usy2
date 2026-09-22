package com.memocat.security;

import com.memocat.config.JwtProperties;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "test-secret-that-is-long-enough-32b!!";

    private JwtService newService(long expirationMinutes) {
        JwtProperties props = new JwtProperties();
        props.setSecret(SECRET);
        props.setExpirationMinutes(expirationMinutes);
        return new JwtService(props);
    }

    @Test
    void generatesTokenAndValidatesRoundTrip() {
        JwtService service = newService(60);

        JwtService.IssuedToken issued = service.generate("alice");

        assertThat(issued.token()).isNotBlank();
        assertThat(issued.expiresAt()).isNotNull();
        assertThat(service.validateAndGetUsername(issued.token())).contains("alice");
    }

    @Test
    void rejectsTamperedToken() {
        JwtService service = newService(60);
        String token = service.generate("alice").token();

        String tampered = token.substring(0, token.length() - 2) + "xx";

        assertThat(service.validateAndGetUsername(tampered)).isEmpty();
    }

    @Test
    void rejectsGarbageToken() {
        JwtService service = newService(60);
        assertThat(service.validateAndGetUsername("not-a-jwt")).isEmpty();
    }

    @Test
    void rejectsExpiredToken() {
        JwtService service = newService(-1); // already expired

        String token = service.generate("alice").token();

        Optional<String> result = service.validateAndGetUsername(token);
        assertThat(result).isEmpty();
    }

    @Test
    void failsFastWhenSecretTooShort() {
        JwtProperties props = new JwtProperties();
        props.setSecret("too-short");

        assertThatThrownBy(() -> new JwtService(props))
                .isInstanceOf(IllegalStateException.class);
    }
}
