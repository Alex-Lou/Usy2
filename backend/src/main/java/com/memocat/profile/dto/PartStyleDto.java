package com.memocat.profile.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * The look of one part of a profile (the page, the presentation card, the
 * tabs, the frames by default, or one frame). Every field is optional: null
 * keeps the part's usual look. Values are hex colours or closed choices only
 * (see StyleValidator), so no CSS can be injected.
 * - bg / bg2: background colour; with bg2, a two-colour gradient.
 * - opacity: background opacity, 0..100 (null: 100).
 * - text / accent: text and accent colours.
 * - border ("none", "thin", "thick") + borderColor; radius ("square", "soft",
 *   "round"); shadow ("none", "soft", "strong"); glass: frosted background.
 * - font (allowlisted key), size ("s", "m", "l", "xl"), bold, align ("left",
 *   "center", "right").
 * - photoAssetId + veil (0..90): the page only, a photo behind everything and
 *   a veil of the background colour over it to keep text readable.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PartStyleDto(String bg, String bg2, Integer opacity, String text, String accent,
                           String border, String borderColor, String radius, String shadow, Boolean glass,
                           String font, String size, Boolean bold, String align,
                           Long photoAssetId, Integer veil) {
}
