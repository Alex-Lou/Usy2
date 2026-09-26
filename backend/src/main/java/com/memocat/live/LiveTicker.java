package com.memocat.live;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** ⚡ The live games' clock: once a second (time up, reveal over, pauses that expire). */
@Component
public class LiveTicker {

    private final LiveService live;

    public LiveTicker(LiveService live) {
        this.live = live;
    }

    @Scheduled(initialDelay = 5_000, fixedDelay = 1_000)
    public void tick() {
        live.tick();
    }
}
