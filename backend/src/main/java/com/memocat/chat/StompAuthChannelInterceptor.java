package com.memocat.chat;

import com.memocat.security.JwtService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collections;

/**
 * Authenticates the STOMP CONNECT frame using the JWT passed in the
 * "Authorization: Bearer …" native header, and binds the resolved username as
 * the session Principal. A missing or invalid token rejects the connection.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;

    public StompAuthChannelInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith(PREFIX)) {
                throw new IllegalArgumentException("Missing bearer token on CONNECT");
            }
            String username = jwtService.validateAndGetUsername(header.substring(PREFIX.length()))
                    .orElseThrow(() -> new IllegalArgumentException("Invalid token on CONNECT"));
            accessor.setUser(new UsernamePasswordAuthenticationToken(
                    username, null, Collections.emptyList()));
        }
        return message;
    }
}
