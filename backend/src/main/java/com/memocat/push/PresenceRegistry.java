package com.memocat.push;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Who is looking at the app right now. Each WebSocket session reports whether
 * its page is visible; a session that never reports counts as not looking.
 * Used to skip push notifications for someone who already sees the in-app bell.
 * Dead connections are dropped by STOMP heartbeats (see WebSocketConfig).
 * <p>
 * A "visible" report only holds for {@link #VISIBLE_FOR}: a page being looked at
 * says so again every 20 s. A phone can freeze a page in the background before it
 * says it is hidden; its "visible" then runs out instead of silencing every push.
 */
@Component
public class PresenceRegistry {

    static final Duration VISIBLE_FOR = Duration.ofSeconds(45);

    private record Session(String username, boolean visible, Instant at) {
    }

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final Clock clock;

    @Autowired
    public PresenceRegistry() {
        this(Clock.systemUTC());
    }

    PresenceRegistry(Clock clock) {
        this.clock = clock;
    }

    /** @return true on the first report of that connection (the app just connected). */
    public boolean report(String sessionId, String username, boolean visible) {
        return sessions.put(sessionId, new Session(username, visible, clock.instant())) == null;
    }

    /** The app is open somewhere (connected), looked at or not. */
    public boolean isConnected(String username) {
        return sessions.values().stream().anyMatch(s -> s.username().equals(username));
    }

    public boolean isLookingAtApp(String username) {
        Instant freshSince = clock.instant().minus(VISIBLE_FOR);
        return sessions.values().stream()
                .anyMatch(s -> s.visible() && s.username().equals(username) && s.at().isAfter(freshSince));
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        sessions.remove(event.getSessionId());
    }
}
