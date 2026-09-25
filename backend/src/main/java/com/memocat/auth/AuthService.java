package com.memocat.auth;

import com.memocat.auth.dto.LoginResponse;
import com.memocat.auth.dto.UserDto;
import com.memocat.domain.User;
import com.memocat.repository.UserRepository;
import com.memocat.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginThrottle throttle;
    /** Checked against for unknown users, so both failures take the same time. */
    private final String dummyHash;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       LoginThrottle throttle) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.throttle = throttle;
        this.dummyHash = passwordEncoder.encode("memocat-no-such-user");
    }

    /**
     * Authenticates a username/password pair. Uses a generic error for both
     * unknown-user and wrong-password so login does not leak which usernames exist.
     * Repeated wrong passwords lock the account for a while (see {@link LoginThrottle}).
     */
    public LoginResponse login(String username, String rawPassword) {
        throttle.check(username);
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            passwordEncoder.matches(rawPassword, dummyHash);
            throw new BadCredentialsException("Invalid username or password");
        }

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throttle.failed(user.getUsername());
            throw new BadCredentialsException("Invalid username or password");
        }
        throttle.succeeded(user.getUsername());

        JwtService.IssuedToken issued = jwtService.generate(user.getUsername());
        return new LoginResponse(issued.token(), issued.expiresAt(), UserDto.from(user));
    }

    /** Looks up the currently authenticated user by username (from the JWT subject). */
    public UserDto currentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return UserDto.from(user);
    }
}
