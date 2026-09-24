package com.memocat.profile.dto;

import com.memocat.asset.Framing;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Profile edit payload. {@code avatarAssetId}, {@code coverAssetId} (banner
 * photo) and {@code bio} (all nullable) are identity/space fields; theme and
 * widgets are the customization. The framings (nullable: centred) say which
 * part of the avatar and cover photos shows.
 * Companion is updated via its own lightweight endpoint.
 */
public record ProfileUpdateRequest(
        @NotNull ThemeDto theme,
        @NotNull List<WidgetDto> widgets,
        Long avatarAssetId,
        String bio,
        Long coverAssetId,
        Framing avatarFraming,
        Framing coverFraming) {

    public ProfileUpdateRequest(ThemeDto theme, List<WidgetDto> widgets, Long avatarAssetId, String bio, Long coverAssetId) {
        this(theme, widgets, avatarAssetId, bio, coverAssetId, null, null);
    }
}
