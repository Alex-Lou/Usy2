package com.memocat.chat;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Sends reaction changes to connected clients once committed. */
@Component
public class MessageReactionBroadcaster {

    static final String TOPIC = "/topic/message-reactions";

    private final SimpMessagingTemplate messaging;

    public MessageReactionBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onChange(MessageReactionsChanged change) {
        messaging.convertAndSend(TOPIC, change);
    }
}
