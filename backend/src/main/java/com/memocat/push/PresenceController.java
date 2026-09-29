package com.memocat.push;

import com.memocat.chat.ChatReceipts;
import com.memocat.push.dto.PresenceReport;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class PresenceController {

    private final PresenceRegistry presence;
    private final ChatReceipts receipts;

    public PresenceController(PresenceRegistry presence, ChatReceipts receipts) {
        this.presence = presence;
        this.receipts = receipts;
    }

    /** /app/presence: the page became visible or hidden. User comes from the STOMP session. */
    @MessageMapping("/presence")
    public void report(PresenceReport report, Principal principal, SimpMessageHeaderAccessor headers) {
        if (presence.report(headers.getSessionId(), principal.getName(), report.visible())) {
            receipts.deliveredAllTo(principal.getName()); // the app is open: waiting messages arrived (✓✓)
        }
    }
}
