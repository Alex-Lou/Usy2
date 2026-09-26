package com.memocat.live;

import java.util.List;

/** ⚡ What the live-game API and /topic/live send: never an answer before its reveal. */
public final class LiveDtos {

    private LiveDtos() {
    }

    /** {@code kind} quiz (theme + level, or theme "mix") or nous ({@code theme} blank: every theme). */
    public record Create(String kind, String theme, Integer level) {
    }

    public record Answer(List<Integer> choices) {
    }

    /** {@code multi}: several options can be ticked (Nous deux). */
    public record Question(String text, List<String> options, boolean multi) {
    }

    /**
     * A question once revealed: the right option (quiz, else -1), what each one
     * answered (option indexes; null = no answer in time) and their points.
     */
    public record Round(int index, String text, List<String> options, int correct, List<Integer> host, List<Integer> guest,
                        int hostPoints, int guestPoints) {
    }

    /**
     * The whole game as both of us see it. Times are epoch milliseconds, with
     * {@code serverNow} to line the clocks up. {@code waiting}: who the paused
     * game waits for. {@code rounds}: the questions revealed so far.
     */
    public record View(long id, String kind, String label, String status, String phase, int index, int total, int seconds,
                       Long deadline, long serverNow, Long pauseEnds, long hostId, String hostName, long guestId, String guestName,
                       Question question, boolean hostAnswered, boolean guestAnswered, List<Long> waiting,
                       int hostScore, int guestScore, String endedReason, List<Round> rounds) {
    }
}
