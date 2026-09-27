package com.memocat.auth;

import com.memocat.auth.dto.LoginResponse;
import com.memocat.domain.User;
import com.memocat.repository.UserRepository;
import com.memocat.chat.LiveSockets;
import com.memocat.push.PushSubscriptionService;
import com.memocat.security.JwtService;
import com.memocat.security.TokenGate;
import com.memocat.web.TooSoonException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Spy
    private LoginThrottle throttle = new LoginThrottle();
    @Mock
    private TokenGate tokenGate;
    @Mock
    private LiveSockets liveSockets;
    @Mock
    private PushSubscriptionService pushSubscriptions;

    @InjectMocks
    private AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User("alice", "hashed-pw", "Alice");
    }

    @Test
    void loginSucceedsWithValidCredentials() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "hashed-pw")).thenReturn(true);
        when(jwtService.generate("alice"))
                .thenReturn(new JwtService.IssuedToken("jwt-token", Instant.now().plusSeconds(3600)));

        LoginResponse response = authService.login("alice", "secret");

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.user().username()).isEqualTo("alice");
        assertThat(response.user().displayName()).isEqualTo("Alice");
    }

    @Test
    void loginFailsForUnknownUser() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login("ghost", "whatever"))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginFailsForWrongPassword() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed-pw")).thenReturn(false);

        assertThatThrownBy(() -> authService.login("alice", "wrong"))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginErrorDoesNotRevealWhetherUserExists() {
        // Unknown user and wrong password must produce the same message.
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());
        lenient().when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        lenient().when(passwordEncoder.matches("wrong", "hashed-pw")).thenReturn(false);

        String unknownMsg = catchMessage(() -> authService.login("ghost", "x"));
        String wrongPwMsg = catchMessage(() -> authService.login("alice", "wrong"));

        assertThat(unknownMsg).isEqualTo(wrongPwMsg);
    }

    @Test
    void repeatedWrongPasswordsLockTheAccountEvenForTheRightOne() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed-pw")).thenReturn(false);
        for (int i = 0; i < LoginThrottle.MAX_FAILURES; i++) {
            assertThatThrownBy(() -> authService.login("alice", "wrong")).isInstanceOf(BadCredentialsException.class);
        }

        assertThatThrownBy(() -> authService.login("alice", "secret")).isInstanceOf(TooSoonException.class);
        assertThatThrownBy(() -> authService.login("ALICE", "secret")).isInstanceOf(TooSoonException.class);
    }

    @Test
    void logoutEverywhereRevokesTokensClosesLiveConnectionsAndDropsNotifications() {
        authService.logoutEverywhere("alice");

        var order = org.mockito.Mockito.inOrder(tokenGate, liveSockets, pushSubscriptions);
        order.verify(tokenGate).revokeAll("alice");
        order.verify(liveSockets).closeAllOf("alice");
        order.verify(pushSubscriptions).removeAllOf("alice");
    }

    private String catchMessage(Runnable r) {
        try {
            r.run();
            return null;
        } catch (BadCredentialsException e) {
            return e.getMessage();
        }
    }
}
