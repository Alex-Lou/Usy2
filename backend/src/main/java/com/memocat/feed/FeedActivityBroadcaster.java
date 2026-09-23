package com.memocat.feed;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Broadcasts feed activity to connected clients on /topic/feed, only once the
 * originating transaction has committed (a client reacting to the event can
 * safely re-fetch and will see the new data).
 */
@Component
public class FeedActivityBroadcaster {

    static final String TOPIC = "/topic/feed";

    private final SimpMessagingTemplate messaging;

    public FeedActivityBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onActivity(FeedActivity activity) {
        messaging.convertAndSend(TOPIC, activity);
    }
}
