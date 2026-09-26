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
 * or wrong, with a little note).
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

    public void judge(String verdict, String note, Instant now) {
        this.verdict = verdict;
        this.note = note;
        this.judgedAt = now;
    }
}
