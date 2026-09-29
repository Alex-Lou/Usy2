package com.memocat.push;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Who is looking at the app right now. Each WebSocket session reports whether
 * its page is visible; a session that never reports counts as not looking.
 * Used to skip push notifications for someone who already sees the in-app bell.
 * Dead connections are dropped by STOMP heartbeats (see WebSocketConfig).
 */
@Component
public class PresenceRegistry {

    private record Session(String username, boolean visible) {
    }

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    /** @return true on the first report of that connection (the app just connected). */
    public boolean report(String sessionId, String username, boolean visible) {
        return sessions.put(sessionId, new Session(username, visible)) == null;
    }

    /** The app is open somewhere (connected), looked at or not. */
    public boolean isConnected(String username) {
        return sessions.values().stream().anyMatch(s -> s.username().equals(username));
    }

    public boolean isLookingAtApp(String username) {
        return sessions.values().stream().anyMatch(s -> s.visible() && s.username().equals(username));
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        sessions.remove(event.getSessionId());
    }
}
