package com.memocat.profile;

import com.memocat.profile.dto.PartStyleDto;
import com.memocat.web.ContentValidationException;

import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Validates the look of a profile part against closed choices: colours are
 * 6-digit hex only and every other field is an allowlisted keyword or a
 * bounded number, so a stored style can never carry CSS of its own.
 */
public final class StyleValidator {

    /**
     * The parts of a profile that can be styled. "tabs" is no longer shown
     * (the profile view has no tabs) but stays accepted: themes saved before
     * keep saving as they are.
     */
    static final Set<String> PARTS = Set.of("page", "header", "tabs", "widgets");
    static final Set<String> BORDERS = Set.of("none", "thin", "thick");
    static final Set<String> RADII = Set.of("square", "soft", "round");
    static final Set<String> SHADOWS = Set.of("none", "soft", "strong");
    static final Set<String> SIZES = Set.of("s", "m", "l", "xl");
    static final Set<String> ALIGNS = Set.of("left", "center", "right");
    static final int MAX_VEIL = 90;
    private static final Pattern HEX = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private StyleValidator() {
    }

    /** The styled parts of a theme: known parts only; only the page may have a photo. */
    public static void validateParts(Map<String, PartStyleDto> parts) {
        if (parts == null) {
            return;
        }
        for (Map.Entry<String, PartStyleDto> entry : parts.entrySet()) {
            if (!PARTS.contains(entry.getKey())) {
                throw new ContentValidationException("Unknown profile part: " + entry.getKey());
            }
            validate(entry.getValue(), "page".equals(entry.getKey()));
        }
    }

    /** One part's look; {@code page} allows a background photo and its veil. */
    public static void validate(PartStyleDto style, boolean page) {
        if (style == null) {
            return;
        }
        color(style.bg(), "bg");
        color(style.bg2(), "bg2");
        color(style.text(), "text");
        color(style.accent(), "accent");
        color(style.borderColor(), "borderColor");
        if (style.opacity() != null && (style.opacity() < 0 || style.opacity() > 100)) {
            throw new ContentValidationException("opacity must be 0 to 100");
        }
        oneOf(style.border(), BORDERS, "border");
        oneOf(style.radius(), RADII, "radius");
        oneOf(style.shadow(), SHADOWS, "shadow");
        oneOf(style.font(), ThemeValidator.FONTS, "font");
        oneOf(style.size(), SIZES, "size");
        oneOf(style.align(), ALIGNS, "align");
        if (!page && (style.photoAssetId() != null || style.veil() != null)) {
            throw new ContentValidationException("Only the page can have a background photo");
        }
        if (style.photoAssetId() != null && style.photoAssetId() <= 0) {
            throw new ContentValidationException("Invalid background photo");
        }
        if (style.veil() != null && (style.veil() < 0 || style.veil() > MAX_VEIL)) {
            throw new ContentValidationException("veil must be 0 to " + MAX_VEIL);
        }
    }

    private static void color(String value, String field) {
        if (value != null && !HEX.matcher(value).matches()) {
            throw new ContentValidationException("Invalid colour for " + field + " (expected #rrggbb)");
        }
    }

    private static void oneOf(String value, Set<String> allowed, String field) {
        if (value != null && !allowed.contains(value)) {
            throw new ContentValidationException("Unsupported " + field + ": " + value);
        }
    }
}
