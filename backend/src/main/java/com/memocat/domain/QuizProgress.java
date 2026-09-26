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

/** A person's best result on one quiz level (stars 0–3, best score). */
@Entity
@Table(name = "quiz_progress")
public class QuizProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "level_key", nullable = false)
    private String levelKey;

    @Column(nullable = false)
    private short stars;

    @Column(name = "best_score", nullable = false)
    private int bestScore;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected QuizProgress() {
    }

    public QuizProgress(User user, String levelKey) {
        this.user = user;
        this.levelKey = levelKey;
    }

    public String getLevelKey() {
        return levelKey;
    }

    public int getStars() {
        return stars;
    }

    public int getBestScore() {
        return bestScore;
    }

    /** Keeps the better of the two; @return whether the score is a new best. */
    public boolean record(int newStars, int score) {
        boolean better = score > bestScore;
        stars = (short) Math.max(stars, newStars);
        bestScore = Math.max(bestScore, score);
        updatedAt = Instant.now();
        return better;
    }
}
