package com.memocat.chat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The open live connections (chat, notifications) and whose they are, so
 * "log out all my devices" can close them at once instead of letting them run
 * until they drop. Entries leave when the connection closes.
 */
@Component
public class LiveSockets implements WebSocketHandlerDecoratorFactory {

    private static final Logger log = LoggerFactory.getLogger(LiveSockets.class);

    private final Map<String, WebSocketSession> sockets = new ConcurrentHashMap<>();
    private final Map<String, String> owners = new ConcurrentHashMap<>();

    @Override
    public WebSocketHandler decorate(WebSocketHandler handler) {
        return new WebSocketHandlerDecorator(handler) {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                sockets.put(session.getId(), session);
                super.afterConnectionEstablished(session);
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
                sockets.remove(session.getId());
                owners.remove(session.getId());
                super.afterConnectionClosed(session, status);
            }
        };
    }

    /** Called once the connection has proved who it is (STOMP CONNECT). */
    void owned(String sessionId, String username) {
        if (sessionId != null && sockets.containsKey(sessionId)) {
            owners.put(sessionId, username);
        }
    }

    public void closeAllOf(String username) {
        owners.forEach((id, owner) -> {
            WebSocketSession socket = owner.equals(username) ? sockets.get(id) : null;
            if (socket != null) {
                try {
                    socket.close(CloseStatus.POLICY_VIOLATION);
                } catch (IOException e) {
                    log.debug("Live connection already gone ({})", e.getClass().getSimpleName());
                }
            }
        });
    }
}
