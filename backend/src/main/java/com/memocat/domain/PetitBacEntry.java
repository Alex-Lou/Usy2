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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/** One player's sheet for a round: answers, the other's answers refused, points. See V47. */
@Entity
@Table(name = "petit_bac_entry")
public class PetitBacEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private PetitBacRound round;

    @Column(name = "player_id", nullable = false)
    private Long playerId;

    /** Direct mode: ready to go. */
    @Column(nullable = false)
    private boolean ready;

    /** At one's own pace: when this player opened the round (the clock starts). */
    @Column(name = "started_at")
    private Instant startedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String answers;

    @Column(name = "done_at")
    private Instant doneAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String rejected;

    @Column(name = "validated_at")
    private Instant validatedAt;

    private Integer score;

    protected PetitBacEntry() {
        // for JPA
    }

    public PetitBacEntry(PetitBacRound round, Long playerId, String emptyAnswers) {
        this.round = round;
        this.playerId = playerId;
        this.answers = emptyAnswers;
        this.rejected = "[]";
    }

    public void ready() {
        this.ready = true;
    }

    public void start(Instant at) {
        if (startedAt == null) startedAt = at;
    }

    public void write(String answers) {
        this.answers = answers;
    }

    public void done(Instant at) {
        if (doneAt == null) doneAt = at;
    }

    public void review(String rejected) {
        this.rejected = rejected;
    }

    public void validate(Instant at) {
        validatedAt = at;
    }

    public void score(int points) {
        score = points;
    }

    public Long getId() {
        return id;
    }

    public PetitBacRound getRound() {
        return round;
    }

    public Long getPlayerId() {
        return playerId;
    }

    public boolean isReady() {
        return ready;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public String getAnswers() {
        return answers;
    }

    public Instant getDoneAt() {
        return doneAt;
    }

    public String getRejected() {
        return rejected;
    }

    public Instant getValidatedAt() {
        return validatedAt;
    }

    public Integer getScore() {
        return score;
    }
}
