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

/** A Petit Bac game between the two of us, played in rounds. See V47. */
@Entity
@Table(name = "petit_bac_game")
public class PetitBacGame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "partner_id", nullable = false)
    private User partner;

    @Column(nullable = false, length = 8)
    private String mode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String categories;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PetitBacGame() {
        // for JPA
    }

    public PetitBacGame(User owner, User partner, String mode, String categories, Instant at) {
        this.owner = owner;
        this.partner = partner;
        this.mode = mode;
        this.categories = categories;
        this.createdAt = at;
        this.updatedAt = at;
    }

    public void touch(Instant at) {
        this.updatedAt = at;
    }

    public Long getId() {
        return id;
    }

    public User getOwner() {
        return owner;
    }

    public User getPartner() {
        return partner;
    }

    public String getMode() {
        return mode;
    }

    public String getCategories() {
        return categories;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
