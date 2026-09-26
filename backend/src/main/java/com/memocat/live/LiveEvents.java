package com.memocat.live;

/** ⚡ Live-game events, handled after commit: the new state goes out, and a push when someone is waited for. */
public final class LiveEvents {

    private LiveEvents() {
    }

    /** A game changed: broadcast it on /topic/live. */
    public record Changed(long gameId) {
    }

    /** Tell {@code recipientId} (push, when they aren't looking at the app). */
    public record Notice(long recipientId, String body, String url, String tag) {
    }
}
