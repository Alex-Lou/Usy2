package com.memocat.pet;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Sends house changes to connected clients on /topic/house once committed. */
@Component
public class HouseActivityBroadcaster {

    static final String TOPIC = "/topic/house";

    private final SimpMessagingTemplate messaging;

    public HouseActivityBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onActivity(HouseActivity activity) {
        messaging.convertAndSend(TOPIC, activity);
    }
}
