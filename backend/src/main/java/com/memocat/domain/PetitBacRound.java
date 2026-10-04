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

/** One round of a Petit Bac game: its letter and its clock. See V47. */
@Entity
@Table(name = "petit_bac_round")
public class PetitBacRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private PetitBacGame game;

    @Column(nullable = false)
    private int number;

    @Column(nullable = false, length = 1)
    private String letter;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Direct mode: when both were ready (the letter shows). */
    @Column(name = "started_at")
    private Instant startedAt;

    /** Direct mode: when the first one cried « Stop ! ». */
    @Column(name = "stop_at")
    private Instant stopAt;

    @Column(name = "stopped_by")
    private Long stoppedBy;

    /** When both had checked the other's answers: the points are counted. */
    @Column(name = "finished_at")
    private Instant finishedAt;

    protected PetitBacRound() {
        // for JPA
    }

    public PetitBacRound(PetitBacGame game, int number, String letter, Instant at) {
        this.game = game;
        this.number = number;
        this.letter = letter;
        this.createdAt = at;
    }

    public void start(Instant at) {
        if (startedAt == null) startedAt = at;
    }

    /** The first « Stop ! » only. */
    public void stop(Long by, Instant at) {
        if (stopAt != null) return;
        stopAt = at;
        stoppedBy = by;
    }

    public void finish(Instant at) {
        finishedAt = at;
    }

    public Long getId() {
        return id;
    }

    public PetitBacGame getGame() {
        return game;
    }

    public int getNumber() {
        return number;
    }

    public String getLetter() {
        return letter;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getStopAt() {
        return stopAt;
    }

    public Long getStoppedBy() {
        return stoppedBy;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }
}
