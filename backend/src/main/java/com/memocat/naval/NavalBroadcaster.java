package com.memocat.naval;

import com.memocat.repository.NavalGameRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** 🚢 Once a game is saved, /topic/naval tells both phones (no ship in it: each fetches its own view). */
@Component
public class NavalBroadcaster {

    static final String TOPIC = "/topic/naval";

    private final NavalGameRepository games;
    private final NavalService naval;
    private final SimpMessagingTemplate messaging;

    public NavalBroadcaster(NavalGameRepository games, NavalService naval, SimpMessagingTemplate messaging) {
        this.games = games;
        this.naval = naval;
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onChanged(NavalEvents changed) {
        games.findById(changed.gameId()).ifPresent(g -> messaging.convertAndSend(TOPIC, naval.ping(g)));
    }
}
