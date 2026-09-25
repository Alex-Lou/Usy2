package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

    /** The widgets shown in both side menus (JSON list, validated before it is stored). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "widgets_json", nullable = false)
    private String widgetsJson = "[]";

    /** Goes up on every change of the shared widgets (see SharedWidgetsService). */
    @Column(name = "widgets_version", nullable = false)
    private int widgetsVersion;

    protected CoupleSettings() {
        // for JPA
    }

    // Shared look of the app (null: the app's default). See SharedAppearanceService.
    @Column(name = "app_font")
    private String appFont;

    @Column(name = "app_heading_font")
    private String appHeadingFont;

    @Column(name = "accent_color")
    private String accentColor;

    @Column(name = "background")
    private String background;

    @Column(name = "background_asset_id")
    private Long backgroundAssetId;

    @Column(name = "chat_font")
    private String chatFont;

    @Column(name = "chat_size")
    private String chatSize;

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

    public String getWidgetsJson() {
        return widgetsJson;
    }

    public int getWidgetsVersion() {
        return widgetsVersion;
    }

    /** Replaces the shared widgets and bumps their version. */
    public void replaceWidgets(String widgetsJson) {
        this.widgetsJson = widgetsJson;
        this.widgetsVersion++;
    }

    public String getAppFont() {
        return appFont;
    }

    public String getAppHeadingFont() {
        return appHeadingFont;
    }

    public String getAccentColor() {
        return accentColor;
    }

    public String getBackground() {
        return background;
    }

    public Long getBackgroundAssetId() {
        return backgroundAssetId;
    }

    public String getChatFont() {
        return chatFont;
    }

    public String getChatSize() {
        return chatSize;
    }

    public void setAppearance(String appFont, String appHeadingFont, String accentColor, String background,
                              Long backgroundAssetId, String chatFont, String chatSize) {
        this.appFont = appFont;
        this.appHeadingFont = appHeadingFont;
        this.accentColor = accentColor;
        this.background = background;
        this.backgroundAssetId = backgroundAssetId;
        this.chatFont = chatFont;
        this.chatSize = chatSize;
    }
}
