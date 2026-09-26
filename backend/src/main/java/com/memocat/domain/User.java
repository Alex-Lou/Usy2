package com.memocat.domain;

import com.memocat.asset.Framing;
import com.memocat.asset.FramingConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A MemoCat account. Only two rows ever exist (the couple); seeded at startup.
 */
@Entity
@Table(name = "app_user")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    /** Optional profile photo (an {@code asset} id), shown as the avatar. */
    @Column(name = "avatar_asset_id")
    private Long avatarAssetId;

    /** Which part of the profile photo shows in the round avatar (null: centred). */
    @Convert(converter = FramingConverter.class)
    @Column(name = "avatar_framing")
    private Framing avatarFraming;

    /** Chosen companion animal, shown as an avatar badge / fallback. */
    @Column(nullable = false)
    private String companion = "cat";

    /** Font this person reads the messages in (a ThemeValidator font key; null: the app's). */
    @Column(name = "reading_font")
    private String readingFont;

    /** Message text size for this person: s, m, l or xl (null: m). */
    @Column(name = "reading_size")
    private String readingSize;

    /** Light/dark look this person chose ("neo" or "scrapbook"; null: not chosen yet). */
    @Column(name = "color_mode")
    private String colorMode;

    /** "Log out all my devices": connections issued before this are refused (null: none). */
    @Column(name = "tokens_valid_after")
    private Instant tokensValidAfter;

    /** "Actus": my Reddit home feed's private link, sealed by SecretBox (null: none). */
    @Column(name = "news_reddit_feed")
    private String newsRedditFeed;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected User() {
        // for JPA
    }

    public User(String username, String passwordHash, String displayName) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public Long getAvatarAssetId() {
        return avatarAssetId;
    }

    public void setAvatarAssetId(Long avatarAssetId) {
        this.avatarAssetId = avatarAssetId;
    }

    public Framing getAvatarFraming() {
        return avatarFraming;
    }

    public void setAvatarFraming(Framing avatarFraming) {
        this.avatarFraming = avatarFraming;
    }

    public String getCompanion() {
        return companion;
    }

    public void setCompanion(String companion) {
        this.companion = companion;
    }

    public String getReadingFont() {
        return readingFont;
    }

    public String getReadingSize() {
        return readingSize;
    }

    public void setReading(String font, String size) {
        this.readingFont = font;
        this.readingSize = size;
    }

    public String getColorMode() {
        return colorMode;
    }

    public void setColorMode(String colorMode) {
        this.colorMode = colorMode;
    }

    public String getNewsRedditFeed() {
        return newsRedditFeed;
    }

    public void setNewsRedditFeed(String newsRedditFeed) {
        this.newsRedditFeed = newsRedditFeed;
    }

    public Instant getTokensValidAfter() {
        return tokensValidAfter;
    }

    public void setTokensValidAfter(Instant tokensValidAfter) {
        this.tokensValidAfter = tokensValidAfter;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
