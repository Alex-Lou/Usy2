package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/** A date on the shared calendar ("Nos dates"), editable by both. */
@Entity
@Table(name = "couple_event")
public class CoupleEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private LocalDate day;

    @Column(name = "at_time")
    private LocalTime time;

    @Column
    private String emoji;

    @Column
    private String note;

    @Column(nullable = false)
    private boolean yearly;

    /** The occurrence the reminder was last sent for (written by a targeted update only). */
    @Column(name = "reminded_for", insertable = false, updatable = false)
    private LocalDate remindedFor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_id", nullable = false, updatable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected CoupleEvent() {
        // for JPA
    }

    public CoupleEvent(User createdBy) {
        this.createdBy = createdBy;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    /** Whether this event falls on {@code date} (every year for a yearly one, 29 Feb → 28 Feb). */
    public boolean occursOn(LocalDate date) {
        if (!yearly) {
            return day.equals(date);
        }
        return !day.isAfter(date) && day.withYear(date.getYear()).equals(date);
    }

    public void edit(String title, LocalDate day, LocalTime time, String emoji, String note, boolean yearly) {
        this.title = title;
        this.day = day;
        this.time = time;
        this.emoji = emoji;
        this.note = note;
        this.yearly = yearly;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public LocalDate getDay() {
        return day;
    }

    public LocalTime getTime() {
        return time;
    }

    public String getEmoji() {
        return emoji;
    }

    public String getNote() {
        return note;
    }

    public boolean isYearly() {
        return yearly;
    }

    public LocalDate getRemindedFor() {
        return remindedFor;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
