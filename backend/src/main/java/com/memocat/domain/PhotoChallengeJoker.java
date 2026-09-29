package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

/** A theme someone chose for a week instead of the app's (once per person and week). */
@Entity
@Table(name = "photo_challenge_joker")
public class PhotoChallengeJoker {

    @Embeddable
    public static class Key implements Serializable {
        @Column(name = "week_start", nullable = false)
        private LocalDate weekStart;

        @Column(name = "user_id", nullable = false)
        private Long userId;

        protected Key() {
        }

        public Key(LocalDate weekStart, Long userId) {
            this.weekStart = weekStart;
            this.userId = userId;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Key k && k.weekStart.equals(weekStart) && k.userId.equals(userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(weekStart, userId);
        }
    }

    @EmbeddedId
    private Key id;

    @Column(nullable = false, length = 80)
    private String theme;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected PhotoChallengeJoker() {
        // for JPA
    }

    public PhotoChallengeJoker(LocalDate weekStart, Long userId, String theme, Instant at) {
        this.id = new Key(weekStart, userId);
        this.theme = theme;
        this.createdAt = at;
    }

    public LocalDate getWeekStart() {
        return id.weekStart;
    }

    public Long getUserId() {
        return id.userId;
    }

    public String getTheme() {
        return theme;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
