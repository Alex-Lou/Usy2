package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;

/**
 * 🏡 The objects placed in one scene of the house (inside or outside), as
 * JSON (see HouseService). Shared by both of us; {@code version} guards
 * against one layout overwriting the other's newer one.
 */
@Entity
@Table(name = "house_layout")
public class HouseLayout {

    public static final String INSIDE = "inside";
    public static final String OUTSIDE = "outside";

    @Id
    private String scene;

    @Column(nullable = false)
    private String items;

    @Version
    private int version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    protected HouseLayout() {
        // for JPA
    }

    public HouseLayout(String scene) {
        this.scene = scene;
        this.items = "[]";
        this.updatedAt = Instant.now();
    }

    public void replace(String items, User by, Instant now) {
        this.items = items;
        this.updatedBy = by;
        this.updatedAt = now;
    }

    public String getScene() {
        return scene;
    }

    public String getItems() {
        return items;
    }

    public int getVersion() {
        return version;
    }
}
