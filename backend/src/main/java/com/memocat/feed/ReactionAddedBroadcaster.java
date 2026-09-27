package com.memocat.feed;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Sends new reactions to connected clients once committed (the owner's bell picks them up). */
@Component
public class ReactionAddedBroadcaster {

    static final String TOPIC = "/topic/reactions";

    private final SimpMessagingTemplate messaging;

    public ReactionAddedBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAdded(ReactionAdded added) {
        messaging.convertAndSend(TOPIC, added);
    }
}
