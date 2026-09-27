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
 * 🚢 A game of battleship between both of us: each fleet and each shot (as
 * JSON), whose turn it is and who won. The rules live in NavalService.
 */
@Entity
@Table(name = "naval_game")
public class NavalGame {

    public static final String PLACING = "placing";
    public static final String PLAYING = "playing";
    public static final String DONE = "done";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "guest_id", nullable = false)
    private User guest;

    @Column(nullable = false)
    private String theme;

    @Column(name = "next_theme")
    private String nextTheme;

    @Column(nullable = false)
    private String status = PLACING;

    @Column(name = "host_fleet", columnDefinition = "text")
    private String hostFleet;

    @Column(name = "guest_fleet", columnDefinition = "text")
    private String guestFleet;

    @Column(name = "host_shots", nullable = false, columnDefinition = "text")
    private String hostShots = "[]";

    @Column(name = "guest_shots", nullable = false, columnDefinition = "text")
    private String guestShots = "[]";

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "turn_id")
    private User turn;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "winner_id")
    private User winner;

    @Column(name = "ended_reason")
    private String endedReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private int version;

    protected NavalGame() {
    }

    public NavalGame(User host, User guest, String theme, Instant now) {
        this.host = host;
        this.guest = guest;
        this.theme = theme;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public Long getId() {
        return id;
    }

    public User getHost() {
        return host;
    }

    public User getGuest() {
        return guest;
    }

    public String getTheme() {
        return theme;
    }

    public String getNextTheme() {
        return nextTheme;
    }

    public String getStatus() {
        return status;
    }

    public User getTurn() {
        return turn;
    }

    public User getWinner() {
        return winner;
    }

    public String getEndedReason() {
        return endedReason;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean isActive() {
        return PLACING.equals(status) || PLAYING.equals(status);
    }

    public boolean isPlayer(Long userId) {
        return host.getId().equals(userId) || guest.getId().equals(userId);
    }

    public boolean isHost(Long userId) {
        return host.getId().equals(userId);
    }

    public String fleetOf(boolean ofHost) {
        return ofHost ? hostFleet : guestFleet;
    }

    public String shotsOf(boolean byHost) {
        return byHost ? hostShots : guestShots;
    }

    public void placeFleet(boolean ofHost, String fleet, Instant now) {
        if (ofHost) {
            hostFleet = fleet;
        } else {
            guestFleet = fleet;
        }
        updatedAt = now;
    }

    public void start(User first, Instant now) {
        status = PLAYING;
        turn = first;
        updatedAt = now;
    }

    public void shot(boolean byHost, String shots, User next, Instant now) {
        if (byHost) {
            hostShots = shots;
        } else {
            guestShots = shots;
        }
        turn = next;
        updatedAt = now;
    }

    public void end(User winner, String reason, Instant now) {
        status = DONE;
        this.winner = winner;
        endedReason = reason;
        turn = null;
        updatedAt = now;
    }

    public void chooseNextTheme(String theme, Instant now) {
        nextTheme = theme;
        updatedAt = now;
    }
}
