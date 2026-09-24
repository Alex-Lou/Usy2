package com.memocat.domain;

import com.memocat.asset.Framing;
import com.memocat.asset.FramingConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/**
 * Customizable profile for a user (1:1). Theme and widgets are stored as JSON
 * (jsonb). Content is validated by the service layer before it is stored here;
 * the entity holds only the canonical JSON strings.
 */
@Entity
@Table(name = "profile")
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "theme_json", nullable = false)
    private String themeJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "widgets_json", nullable = false)
    private String widgetsJson;

    /** Short free-text bio shown in the profile hero. */
    @Column(name = "bio")
    private String bio;

    /** Photo shown in the profile's banner (null: the theme gradient). */
    @Column(name = "cover_asset_id")
    private Long coverAssetId;

    /** Which part of the cover photo shows in the banner (null: centred). */
    @Convert(converter = FramingConverter.class)
    @Column(name = "cover_framing")
    private Framing coverFraming;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Profile() {
        // for JPA
    }

    public Profile(User user, String themeJson, String widgetsJson) {
        this.user = user;
        this.themeJson = themeJson;
        this.widgetsJson = widgetsJson;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getThemeJson() {
        return themeJson;
    }

    public void setThemeJson(String themeJson) {
        this.themeJson = themeJson;
    }

    public String getWidgetsJson() {
        return widgetsJson;
    }

    public void setWidgetsJson(String widgetsJson) {
        this.widgetsJson = widgetsJson;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Long getCoverAssetId() {
        return coverAssetId;
    }

    public void setCoverAssetId(Long coverAssetId) {
        this.coverAssetId = coverAssetId;
    }

    public Framing getCoverFraming() {
        return coverFraming;
    }

    public void setCoverFraming(Framing coverFraming) {
        this.coverFraming = coverFraming;
    }
}
