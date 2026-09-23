package com.memocat.profile.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Profile edit payload. {@code avatarAssetId}, {@code coverAssetId} (banner
 * photo) and {@code bio} (all nullable) are identity/space fields; theme and
 * widgets are the customization.
 * Companion is updated via its own lightweight endpoint.
 */
public record ProfileUpdateRequest(
        @NotNull ThemeDto theme,
        @NotNull List<WidgetDto> widgets,
        Long avatarAssetId,
        String bio,
        Long coverAssetId) {
}
