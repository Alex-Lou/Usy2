package com.memocat.nous.dto;

import java.time.Instant;
import java.util.List;

/** What the 💞 Nous deux API sends: never the other one's answer before I have guessed it. */
public final class NousDtos {

    private NousDtos() {
    }

    public record Theme(String id, String label, String emoji, String color, int total, int guessable) {
    }

    /** A card: {@code kind} as in NousBank (c, u, e, o, h, m, f, l, or p just to talk); {@code talked} by either of us. */
    public record Card(String id, String theme, String kind, String text, List<String> options, boolean fav, boolean talked,
                       boolean answered) {
    }

    /** Guesses judged so far by verdict; {@code percent}: the average of their points, null until one is judged. */
    public record Score(int right, int close, int some, int wrong, int pending, Integer percent) {
    }

    /**
     * {@code me}: how well I know the other one; {@code them}: how well they know me.
     * {@code toGuess}: their answers I haven't guessed; {@code toJudge}: guesses about me waiting for my verdict;
     * {@code reset}: a proposal to start again, waiting for an answer (or null).
     */
    public record Overview(String partnerName, List<Theme> themes, int answerable, int myAnswers, int theirAnswers,
                           int toGuess, int toJudge, Score me, Score them, Card daily, ResetState reset) {
    }

    /** A reset proposed by one of us ({@code mine}: by me), for a theme or everything ({@code theme} null). */
    public record ResetState(boolean mine, String byName, String theme, Instant createdAt) {
    }

    /** {@code theme}: a theme id, or null / blank for all of them. */
    public record ResetRequest(String theme) {
    }

    /**
     * One of my questions and what I answered, if I did: {@code choices} the
     * options I ticked (one for u, the point 0–10 for e, the order first to
     * last for o), or {@code answer} in words.
     */
    public record Mine(String id, String theme, String kind, String text, List<String> options, List<Integer> choices, String answer) {
    }

    /**
     * One of the other's answered questions, to guess (no answer inside). A
     * hangman carries the word as found so far ({@code pattern}, {@code _} for
     * each letter to find) and the letters already {@code tried}.
     */
    public record ToGuess(String id, String theme, String kind, String text, List<String> options, String pattern, String tried) {
    }

    /** One letter of a hangman. */
    public record Letter(String id, String letter) {
    }

    /** A hangman after a letter: {@code reveal} once it is over (found or hanged). */
    public record HangmanState(String id, String pattern, String tried, int errors, int maxErrors, Reveal reveal) {
    }

    /**
     * A guess with the answer it was about: {@code verdict} right / close /
     * some / wrong, or null while the author hasn't judged it; {@code points}
     * 0–100 (choices: ticks in common ÷ ticks in all, {@code common} and
     * {@code union}; ranking: well placed ÷ all, the same two; scale: 100 less
     * 20 a step apart; hangman: 100 less 10 an error, and its {@code letters}
     * and {@code errors}; words: right 100, close 50, wrong 0).
     */
    public record Reveal(long guessId, String id, String theme, String kind, String text, List<String> options,
                         List<Integer> guessChoices, String guessText, List<Integer> answerChoices, String answerText,
                         String verdict, String note, Instant createdAt, Integer points, Integer common, Integer union,
                         String letters, Integer errors) {
    }

    /** Answers that are exactly the same, among the {@code compared} ones (both answered, and theirs known to me). */
    public record Agreement(int same, int compared, Integer percent) {
    }

    public record ThemeScore(String id, Score me, Score them, int myAnswers, int theirAnswers, int guessable, Agreement agreement) {
    }

    /** How well we know each other, in all and by theme. */
    public record Scores(Score me, Score them, Agreement agreement, List<ThemeScore> themes) {
    }

    /** An answer as shown: {@code choices} (as in {@link Mine}) or {@code text}. */
    public record Said(List<Integer> choices, String text) {
    }

    /**
     * A question side by side: my answer and theirs. {@code locked} while I
     * haven't guessed theirs (it stays hidden); {@code same} when both are
     * known and alike; the verdicts of my guess about theirs and theirs about mine.
     */
    public record Compare(String id, String theme, String kind, String text, List<String> options, Said mine, Said theirs,
                          boolean locked, Boolean same, String myVerdict, String theirVerdict) {
    }

    /** {@code mine}: my guesses about the other; {@code theirs}: their guesses about me. */
    public record History(List<Reveal> mine, List<Reveal> theirs) {
    }

    /** {@code choices}: the ticked options (one for u, the point for e, the whole order for o), or {@code text} (words). */
    public record Answer(String id, List<Integer> choices, String text) {
    }

    public record Mark(String id, String kind, boolean on) {
    }

    public record Judge(String verdict, String note) {
    }
}
