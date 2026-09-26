package com.memocat.quiz.dto;

import java.util.List;

/** What the quiz API sends: never a right answer before it has been answered. */
public final class QuizDtos {

    private QuizDtos() {
    }

    public record Level(int level, int stars, int best, boolean unlocked) {
    }

    public record Theme(String id, String label, String emoji, String color, List<Level> levels) {
    }

    public record Overview(List<Theme> themes) {
    }

    public record Question(int index, int total, String text, List<String> options, int seconds) {
    }

    public record Run(String id, String theme, int level, Question question) {
    }

    /** {@code challengeId}: the "défi" this run was ({@code challengeDone} once both have played it). */
    public record Result(int score, int correct, int total, int stars, int best, boolean newBest, boolean unlockedNext,
                         Long challengeId, boolean challengeDone) {
    }

    /** After an answer: was it right, which was right, and the next question or the end. */
    public record Answered(boolean correct, int correctIndex, int gained, int score, int streak, Question next, Result result) {
    }

    public record Start(String theme, Integer level) {
    }

    public record Answer(int choice) {
    }

    /**
     * A "défi" as I see it: {@code status} "play" (mine to play or finish),
     * "wait" (sent, the other hasn't finished) or "done"; scores are only
     * given once known, {@code outcome} win / lose / tie once done.
     */
    public record Challenge(long id, String theme, String label, String emoji, String color, int level, String fromName,
                            boolean sentByMe, String status, Integer myScore, Integer theirScore, int answered, int total,
                            String outcome, java.time.Instant createdAt) {
    }

    public record Challenges(String partnerName, int wins, int losses, int ties, int openSent, int maxOpen, List<Challenge> items) {
    }

    /** One question of a finished duel: the right answer and how each of us did. */
    public record DuelLine(String text, List<String> options, int correct, boolean mine, boolean theirs) {
    }

    public record Duel(Challenge challenge, String myName, String theirName, List<DuelLine> lines) {
    }
}
