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

/** A little note hidden behind a photo, for the other one to stumble upon. */
@Entity
@Table(name = "hidden_note")
public class HiddenNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(name = "asset_id", nullable = false)
    private Long assetId;

    @Column(nullable = false, length = 280)
    private String text;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "found_at")
    private Instant foundAt;

    protected HiddenNote() {
        // for JPA
    }

    public HiddenNote(User author, Long assetId, String text, Instant at) {
        this.author = author;
        this.assetId = assetId;
        this.text = text;
        this.createdAt = at;
    }

    /** First discovery only; true if it was found just now. */
    public boolean find(Instant at) {
        if (foundAt != null) return false;
        foundAt = at;
        return true;
    }

    public Long getId() {
        return id;
    }

    public User getAuthor() {
        return author;
    }

    public Long getAssetId() {
        return assetId;
    }

    public String getText() {
        return text;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getFoundAt() {
        return foundAt;
    }
}
