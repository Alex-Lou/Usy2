package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

/** A person's live mood (one row per user, replaced on each change). */
@Entity
@Table(name = "mood")
public class Mood {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String emoji;

    @Column
    private String label;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Mood() {
        // for JPA
    }

    public Mood(Long userId) {
        this.userId = userId;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public void set(String emoji, String label) {
        this.emoji = emoji;
        this.label = label;
    }

    public Long getUserId() {
        return userId;
    }

    public String getEmoji() {
        return emoji;
    }

    public String getLabel() {
        return label;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
