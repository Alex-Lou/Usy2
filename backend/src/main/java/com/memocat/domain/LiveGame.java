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
import jakarta.persistence.Version;

import java.time.Instant;

/**
 * ⚡ A game played live by both of us (quiz duel or "Même longueur d'onde"):
 * the questions, both answers so far, whose turn of the clock it is, and the
 * pause when someone didn't answer in time. The rules live in LiveService.
 */
@Entity
@Table(name = "live_game")
public class LiveGame {

    public static final String INVITED = "invited";
    public static final String PLAYING = "playing";
    public static final String PAUSED = "paused";
    public static final String DONE = "done";
    public static final String CANCELLED = "cancelled";
    public static final String QUESTION = "question";
    public static final String REVEAL = "reveal";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String kind;

    @Column(nullable = false)
    private String label;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "guest_id", nullable = false)
    private User guest;

    @Column(nullable = false, columnDefinition = "text")
    private String items;

    @Column(nullable = false, columnDefinition = "text")
    private String answers = "[]";

    @Column(nullable = false)
    private String status = INVITED;

    private String phase;

    @Column(name = "idx", nullable = false)
    private short index;

    @Column(nullable = false)
    private short seconds;

    private Instant deadline;

    @Column(name = "paused_at")
    private Instant pausedAt;

    @Column(name = "host_score", nullable = false)
    private int hostScore;

    @Column(name = "guest_score", nullable = false)
    private int guestScore;

    @Column(name = "ended_reason")
    private String endedReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private int version;

    protected LiveGame() {
    }

    public LiveGame(String kind, String label, User host, User guest, String items, int seconds, Instant now) {
        this.kind = kind;
        this.label = label;
        this.host = host;
        this.guest = guest;
        this.items = items;
        this.seconds = (short) seconds;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public Long getId() {
        return id;
    }

    public String getKind() {
        return kind;
    }

    public String getLabel() {
        return label;
    }

    public User getHost() {
        return host;
    }

    public User getGuest() {
        return guest;
    }

    public String getItems() {
        return items;
    }

    public String getAnswers() {
        return answers;
    }

    public void setAnswers(String answers) {
        this.answers = answers;
    }

    public String getStatus() {
        return status;
    }

    public String getPhase() {
        return phase;
    }

    public int getIndex() {
        return index;
    }

    public int getSeconds() {
        return seconds;
    }

    public Instant getDeadline() {
        return deadline;
    }

    public Instant getPausedAt() {
        return pausedAt;
    }

    public int getHostScore() {
        return hostScore;
    }

    public int getGuestScore() {
        return guestScore;
    }

    public String getEndedReason() {
        return endedReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isActive() {
        return INVITED.equals(status) || PLAYING.equals(status) || PAUSED.equals(status);
    }

    public boolean isPlayer(Long userId) {
        return host.getId().equals(userId) || guest.getId().equals(userId);
    }

    /** Question {@code index}, open until {@code deadline}. */
    public void ask(int index, Instant deadline, Instant now) {
        this.status = PLAYING;
        this.phase = QUESTION;
        this.index = (short) index;
        this.deadline = deadline;
        this.pausedAt = null;
        this.updatedAt = now;
    }

    public void reveal(Instant until, Instant now) {
        this.phase = REVEAL;
        this.deadline = until;
        this.updatedAt = now;
    }

    public void pause(Instant now) {
        this.status = PAUSED;
        this.pausedAt = now;
        this.deadline = null;
        this.updatedAt = now;
    }

    public void addScores(int host, int guest) {
        this.hostScore += host;
        this.guestScore += guest;
    }

    public void end(String status, String reason, Instant now) {
        this.status = status;
        this.endedReason = reason;
        this.phase = null;
        this.deadline = null;
        this.updatedAt = now;
    }
}
