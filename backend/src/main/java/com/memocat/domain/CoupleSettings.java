package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;

/** Settings shared by the couple (single row, id = 1). */
@Entity
@Table(name = "couple_settings")
public class CoupleSettings {

    public static final short SINGLETON_ID = 1;

    @Id
    private Short id;

    @Column(name = "together_since")
    private LocalDate togetherSince;

    protected CoupleSettings() {
        // for JPA
    }

    public static CoupleSettings create() {
        CoupleSettings settings = new CoupleSettings();
        settings.id = SINGLETON_ID;
        return settings;
    }

    public LocalDate getTogetherSince() {
        return togetherSince;
    }

    public void setTogetherSince(LocalDate togetherSince) {
        this.togetherSince = togetherSince;
    }
}
