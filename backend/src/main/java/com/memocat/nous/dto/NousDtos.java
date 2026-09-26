package com.memocat.nous.dto;

import java.time.Instant;
import java.util.List;

/** What the 💞 Nous deux API sends: never the other one's answer before I have guessed it. */
public final class NousDtos {

    private NousDtos() {
    }

    public record Theme(String id, String label, String emoji, String color, int total, int guessable) {
    }

    /** A card: {@code kind} c (choice), l (own words) or p (just to talk); {@code talked} by either of us. */
    public record Card(String id, String theme, String kind, String text, List<String> options, boolean fav, boolean talked,
                       boolean answered) {
    }

    /** Guesses judged so far: right counts 2, close 1; {@code percent} null until one is judged. */
    public record Score(int right, int close, int wrong, int pending, Integer percent) {
    }

    /**
     * {@code me}: how well I know the other one; {@code them}: how well they know me.
     * {@code toGuess}: their answers I haven't guessed; {@code toJudge}: guesses about me waiting for my verdict.
     */
    public record Overview(String partnerName, List<Theme> themes, int answerable, int myAnswers, int theirAnswers,
                           int toGuess, int toJudge, Score me, Score them, Card daily) {
    }

    /** One of my questions (c or l) and what I answered, if I did. */
    public record Mine(String id, String theme, String kind, String text, List<String> options, Integer choice, String answer) {
    }

    /** One of the other's answered questions, to guess (no answer inside). */
    public record ToGuess(String id, String theme, String kind, String text, List<String> options) {
    }

    /**
     * A guess with the answer it was about: {@code verdict} right / close /
     * wrong, or null while the author hasn't judged it.
     */
    public record Reveal(long guessId, String id, String theme, String kind, String text, List<String> options,
                         Integer guessChoice, String guessText, Integer answerChoice, String answerText,
                         String verdict, String note, Instant createdAt) {
    }

    /** {@code mine}: my guesses about the other; {@code theirs}: their guesses about me. */
    public record History(List<Reveal> mine, List<Reveal> theirs) {
    }

    public record Answer(String id, Integer choice, String text) {
    }

    public record Mark(String id, String kind, boolean on) {
    }

    public record Judge(String verdict, String note) {
    }
}
