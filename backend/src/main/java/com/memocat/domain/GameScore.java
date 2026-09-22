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

@Entity
@Table(name = "game_score")
public class GameScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String type;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private int wins;

    @Column(nullable = false)
    private int draws;

    @Column(nullable = false)
    private int losses;

    protected GameScore() {
    }

    public GameScore(String type, User user) {
        this.type = type;
        this.user = user;
    }

    public User getUser() {
        return user;
    }

    public int getWins() {
        return wins;
    }

    public int getDraws() {
        return draws;
    }

    public int getLosses() {
        return losses;
    }

    public void addWin() {
        this.wins++;
    }

    public void addDraw() {
        this.draws++;
    }

    public void addLoss() {
        this.losses++;
    }
}
