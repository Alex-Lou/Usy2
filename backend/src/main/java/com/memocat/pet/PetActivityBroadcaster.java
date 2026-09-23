package com.memocat.pet;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Sends cat interactions to connected clients on /topic/pet once committed. */
@Component
public class PetActivityBroadcaster {

    static final String TOPIC = "/topic/pet";

    private final SimpMessagingTemplate messaging;

    public PetActivityBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onActivity(PetActivity activity) {
        messaging.convertAndSend(TOPIC, activity);
    }
}
