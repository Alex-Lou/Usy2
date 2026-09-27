package com.memocat.couple.dto;

/**
 * The shared look of the app (null fields: the app's default). Each person's
 * own choices still win on their screens.
 * background: a preset name, or "photo" with {@code backgroundAssetId}.
 */
public record AppearanceDto(String font, String headingFont, String accent, String background,
                            Long backgroundAssetId, String chatFont, String chatSize) {
}
