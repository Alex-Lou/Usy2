package com.memocat.live;

import com.memocat.repository.LiveGameRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** ⚡ Sends a live game's new state on /topic/live once it is saved (both phones follow it). */
@Component
public class LiveBroadcaster {

    static final String TOPIC = "/topic/live";

    private final LiveGameRepository games;
    private final LiveService live;
    private final SimpMessagingTemplate messaging;

    public LiveBroadcaster(LiveGameRepository games, LiveService live, SimpMessagingTemplate messaging) {
        this.games = games;
        this.live = live;
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onChanged(LiveEvents.Changed changed) {
        games.findById(changed.gameId()).ifPresent(g -> messaging.convertAndSend(TOPIC, live.view(g)));
    }
}
