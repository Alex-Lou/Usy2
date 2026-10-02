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

/** A "mots fléchés" grid being played, alone or together ({@code shared}). See V45 for the cell strings. */
@Entity
@Table(name = "crossword_game")
public class CrosswordGame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 8)
    private String size;

    @Column(nullable = false)
    private boolean shared;

    @Column(nullable = false, length = 16)
    private String theme;

    @Column(nullable = false, length = 12)
    private String level;

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String clues;

    @Column(nullable = false)
    private String solution;

    @Column(nullable = false)
    private String letters;

    @Column(nullable = false)
    private String authors;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    protected CrosswordGame() {
        // for JPA
    }

    public CrosswordGame(User owner, String size, String theme, String level, boolean shared, int width, int height,
                         String clues, String solution, Instant at) {
        this.owner = owner;
        this.size = size;
        this.theme = theme;
        this.level = level;
        this.shared = shared;
        this.width = width;
        this.height = height;
        this.clues = clues;
        this.solution = solution;
        this.letters = solution.replaceAll("[A-Z]", ".");
        this.authors = ".".repeat(solution.length());
        this.createdAt = at;
        this.updatedAt = at;
    }

    /** Writes the cells (already checked) and finishes the grid when it is all right. */
    public void write(String letters, String authors, Instant at) {
        this.letters = letters;
        this.authors = authors;
        this.updatedAt = at;
        if (finishedAt == null && letters.equals(solution)) finishedAt = at;
    }

    public Long getId() {
        return id;
    }

    public User getOwner() {
        return owner;
    }

    public String getSize() {
        return size;
    }

    public String getTheme() {
        return theme;
    }

    public String getLevel() {
        return level;
    }

    public boolean isShared() {
        return shared;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public String getClues() {
        return clues;
    }

    public String getSolution() {
        return solution;
    }

    public String getLetters() {
        return letters;
    }

    public String getAuthors() {
        return authors;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }
}
