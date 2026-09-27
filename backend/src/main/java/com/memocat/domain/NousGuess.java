package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * 💞 Nous deux: one guess about the other person's answer. Ticked choices
 * (a bit set) are judged at once by their share of ticks in common (see
 * NousService.verdict); words wait for the verdict of the person it is about (right, close
 * or wrong, with a little note). A hangman is played letter by letter: while
 * {@code letters} is set and there is no verdict yet, the game is still on.
 */
@Entity
@Table(name = "nous_guess")
public class NousGuess {

    public static final String RIGHT = "right";
    public static final String CLOSE = "close";
    /** Ticked choices only: under half of the ticks in common, but some. */
    public static final String SOME = "some";
    public static final String WRONG = "wrong";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "guesser_id", nullable = false)
    private User guesser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(name = "question_id", nullable = false)
    private String questionId;

    /** Bit i set: option i ticked. */
    private Integer choices;

    @Column(name = "guess_text")
    private String text;

    /** A ranking: the option indexes, first to last, comma-separated. */
    private String ranking;

    /** A hangman: the letters tried so far, in order. */
    private String letters;

    private String verdict;

    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "judged_at")
    private Instant judgedAt;

    protected NousGuess() {
    }

    public NousGuess(User guesser, User author, String questionId, Integer choices, String text, Instant now) {
        this.guesser = guesser;
        this.author = author;
        this.questionId = questionId;
        this.choices = choices;
        this.text = text;
        this.createdAt = now;
    }

    public Long getId() {
        return id;
    }

    public User getGuesser() {
        return guesser;
    }

    public User getAuthor() {
        return author;
    }

    public String getQuestionId() {
        return questionId;
    }

    public Integer getChoices() {
        return choices;
    }

    public String getRanking() {
        return ranking;
    }

    public String getLetters() {
        return letters;
    }

    /** A hangman still being played (no verdict yet). */
    public boolean playing() {
        return letters != null && verdict == null;
    }

    public String getText() {
        return text;
    }

    public String getVerdict() {
        return verdict;
    }

    public String getNote() {
        return note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public static NousGuess ranked(User guesser, User author, String questionId, String ranking, Instant now) {
        NousGuess g = new NousGuess(guesser, author, questionId, null, null, now);
        g.ranking = ranking;
        return g;
    }

    public static NousGuess hangman(User guesser, User author, String questionId, Instant now) {
        NousGuess g = new NousGuess(guesser, author, questionId, null, null, now);
        g.letters = "";
        return g;
    }

    public void tryLetter(char letter) {
        letters = letters + letter;
    }

    public void judge(String verdict, String note, Instant now) {
        this.verdict = verdict;
        this.note = note;
        this.judgedAt = now;
    }
}
