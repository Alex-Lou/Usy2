package com.memocat.feed;

import com.memocat.feed.dto.CommentReactionsDto;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Sends comment reaction changes to connected clients once committed. */
@Component
public class CommentReactionBroadcaster {

    static final String TOPIC = "/topic/comment-reactions";

    private final SimpMessagingTemplate messaging;

    public CommentReactionBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onChange(CommentReactionsDto change) {
        messaging.convertAndSend(TOPIC, change);
    }
}
