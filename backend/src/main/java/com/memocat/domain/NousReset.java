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

/** 💞 Nous deux: one of us proposes to start a theme (or everything) again; nothing is erased until the other agrees. */
@Entity
@Table(name = "nous_reset")
public class NousReset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by", nullable = false)
    private User requestedBy;

    /** A theme id, or null for all of them. */
    private String theme;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected NousReset() {
    }

    public NousReset(User requestedBy, String theme, Instant now) {
        this.requestedBy = requestedBy;
        this.theme = theme;
        this.createdAt = now;
    }

    public User getRequestedBy() {
        return requestedBy;
    }

    public String getTheme() {
        return theme;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
