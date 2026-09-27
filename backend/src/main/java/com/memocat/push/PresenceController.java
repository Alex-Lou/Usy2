package com.memocat.push;

import com.memocat.push.dto.PresenceReport;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class PresenceController {

    private final PresenceRegistry presence;

    public PresenceController(PresenceRegistry presence) {
        this.presence = presence;
    }

    /** /app/presence: the page became visible or hidden. User comes from the STOMP session. */
    @MessageMapping("/presence")
    public void report(PresenceReport report, Principal principal, SimpMessageHeaderAccessor headers) {
        presence.report(headers.getSessionId(), principal.getName(), report.visible());
    }
}
