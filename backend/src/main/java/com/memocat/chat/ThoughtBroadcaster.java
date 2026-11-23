package com.memocat.chat;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** A « je pense à toi » joins the open conversations once committed, like a message. */
@Component
public class ThoughtBroadcaster {

    static final String TOPIC = "/topic/messages";

    private final SimpMessagingTemplate messaging;

    public ThoughtBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onThought(ThoughtSent sent) {
        messaging.convertAndSend(TOPIC, sent.message());
    }
}
