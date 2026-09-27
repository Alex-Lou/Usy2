package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;

/** The couple's shared cat (single row, id = 1). */
@Entity
@Table(name = "pet")
public class Pet {

    public static final short SINGLETON_ID = 1;

    @Id
    private Short id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private short satiety;

    @Column(nullable = false)
    private short happiness;

    @Column(nullable = false)
    private short cleanliness;

    @Column(nullable = false)
    private short energy;

    /** Shared purse, earned by caring for the cat. */
    @Column(nullable = false)
    private int coins;

    @Column(name = "coins_today", nullable = false)
    private int coinsToday;

    @Column(name = "coins_day")
    private LocalDate coinsDay;

    /** When satiety/happiness were last computed (they decay from there). */
    @Column(name = "stats_at", nullable = false)
    private Instant statsAt;

    @Column(name = "last_action")
    private String lastAction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_actor_id")
    private User lastActor;

    @Column(name = "last_action_at")
    private Instant lastActionAt;

    protected Pet() {
        // for JPA
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getSatiety() {
        return satiety;
    }

    public int getHappiness() {
        return happiness;
    }

    public Instant getStatsAt() {
        return statsAt;
    }

    public int getCleanliness() {
        return cleanliness;
    }

    public int getEnergy() {
        return energy;
    }

    public void setStats(int satiety, int happiness, int cleanliness, int energy, Instant at) {
        this.satiety = (short) satiety;
        this.happiness = (short) happiness;
        this.cleanliness = (short) cleanliness;
        this.energy = (short) energy;
        this.statsAt = at;
    }

    public int getCoins() {
        return coins;
    }

    /** Coins earned so far on {@code day} (resets when the day changes). */
    public int coinsEarnedOn(LocalDate day) {
        return day.equals(coinsDay) ? coinsToday : 0;
    }

    public void earn(int amount, LocalDate day) {
        this.coinsToday = coinsEarnedOn(day) + amount;
        this.coinsDay = day;
        this.coins += amount;
    }

    public void spend(int amount) {
        this.coins -= amount;
    }

    public String getLastAction() {
        return lastAction;
    }

    public User getLastActor() {
        return lastActor;
    }

    public Instant getLastActionAt() {
        return lastActionAt;
    }

    public void recordAction(String action, User actor, Instant at) {
        this.lastAction = action;
        this.lastActor = actor;
        this.lastActionAt = at;
    }
}
