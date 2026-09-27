package com.memocat.couple;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Broadcasts "Nous" changes on /topic/couple once committed, so clients can re-fetch. */
@Component
public class CoupleActivityBroadcaster {

    static final String TOPIC = "/topic/couple";

    private final SimpMessagingTemplate messaging;

    public CoupleActivityBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onActivity(CoupleActivity activity) {
        messaging.convertAndSend(TOPIC, activity);
    }
}
