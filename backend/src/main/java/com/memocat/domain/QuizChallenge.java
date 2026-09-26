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
 * A quiz "défi": the questions one person played (fixed, with their answers
 * and the right one), their result, and the other person's result as they play
 * the very same questions. Finished once the other person has answered them all.
 */
@Entity
@Table(name = "quiz_challenge")
public class QuizChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_user_id", nullable = false)
    private User fromUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_user_id", nullable = false)
    private User toUser;

    @Column(nullable = false)
    private String theme;

    @Column(nullable = false)
    private short level;

    @Column(nullable = false, columnDefinition = "text")
    private String items;

    @Column(name = "from_score", nullable = false)
    private int fromScore;

    @Column(name = "from_marks", nullable = false)
    private String fromMarks;

    @Column(name = "to_score", nullable = false)
    private int toScore;

    @Column(name = "to_marks", nullable = false)
    private String toMarks = "";

    @Column(name = "to_started_at")
    private Instant toStartedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    protected QuizChallenge() {
    }

    public QuizChallenge(User fromUser, User toUser, String theme, int level, String items, int fromScore, String fromMarks, Instant now) {
        this.fromUser = fromUser;
        this.toUser = toUser;
        this.theme = theme;
        this.level = (short) level;
        this.items = items;
        this.fromScore = fromScore;
        this.fromMarks = fromMarks;
        this.createdAt = now;
    }

    public Long getId() {
        return id;
    }

    public User getFromUser() {
        return fromUser;
    }

    public User getToUser() {
        return toUser;
    }

    public String getTheme() {
        return theme;
    }

    public int getLevel() {
        return level;
    }

    public String getItems() {
        return items;
    }

    public int getFromScore() {
        return fromScore;
    }

    public String getFromMarks() {
        return fromMarks;
    }

    public int getToScore() {
        return toScore;
    }

    public String getToMarks() {
        return toMarks;
    }

    public Instant getToStartedAt() {
        return toStartedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public boolean isFinished() {
        return finishedAt != null;
    }

    public void start(Instant now) {
        if (toStartedAt == null) {
            toStartedAt = now;
        }
    }

    /** The other person's progress so far (one mark per answered question). */
    public void progress(String marks, int score) {
        this.toMarks = marks;
        this.toScore = score;
    }

    public void finish(Instant now) {
        this.finishedAt = now;
    }
}
