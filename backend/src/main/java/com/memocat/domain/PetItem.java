package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/** An accessory the couple bought for the cat (see PetCatalog). */
@Entity
@Table(name = "pet_item")
public class PetItem {

    @Id
    private String item;

    @Column(nullable = false)
    private boolean equipped;

    @Column(name = "bought_at", nullable = false, updatable = false)
    private Instant boughtAt;

    protected PetItem() {
        // for JPA
    }

    public PetItem(String item) {
        this.item = item;
    }

    @PrePersist
    void onCreate() {
        if (boughtAt == null) {
            boughtAt = Instant.now();
        }
    }

    public String getItem() {
        return item;
    }

    public boolean isEquipped() {
        return equipped;
    }

    public void setEquipped(boolean equipped) {
        this.equipped = equipped;
    }
}
