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
import java.time.LocalDate;

/** Someone's photo for a week's challenge (one per person and week, replaceable during the week). */
@Entity
@Table(name = "photo_challenge_entry")
public class PhotoChallengeEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Column(length = 200)
    private String caption;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected PhotoChallengeEntry() {
        // for JPA
    }

    public PhotoChallengeEntry(LocalDate weekStart, User author, Asset asset, String caption, Instant at) {
        this.weekStart = weekStart;
        this.author = author;
        this.asset = asset;
        this.caption = caption;
        this.createdAt = at;
    }

    public void replace(Asset asset, String caption, Instant at) {
        this.asset = asset;
        this.caption = caption;
        this.createdAt = at;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getWeekStart() {
        return weekStart;
    }

    public User getAuthor() {
        return author;
    }

    public Asset getAsset() {
        return asset;
    }

    public String getCaption() {
        return caption;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
