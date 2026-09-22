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

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /**
     * Authenticates a username/password pair. Uses a generic error for both
     * unknown-user and wrong-password so login does not leak which usernames exist.
     */
    public LoginResponse login(String username, String rawPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

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
