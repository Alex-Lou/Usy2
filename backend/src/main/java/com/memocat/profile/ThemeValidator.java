package com.memocat.profile;

import com.memocat.profile.dto.ThemeDto;
import com.memocat.web.ContentValidationException;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Validates a theme against a strict allowlist. Because colors accept only
 * 6-digit hex, no CSS injection vector (url(), expression(), rgb(), etc.) can
 * pass through — this is what makes profile theming safe without a sandbox.
 */
@Component
public class ThemeValidator {

    static final Set<String> COLOR_KEYS = Set.of("bg", "surface", "primary", "text");
    static final Set<String> FONTS = Set.of(
            "app", "trebuchet", "georgia", "courier", "comic", "system",
            // Rounded
            "nunito", "quicksand", "comfortaa", "baloo", "fredoka",
            // Handwritten
            "dancing", "pacifico", "satisfy", "indie", "patrick", "caveat",
            // Celtic / fairy
            "uncial", "medieval", "cinzel", "almendra", "imfell",
            // Elegant serif
            "playfair", "lora", "cormorant", "garamond");
    static final Set<String> FONT_SCOPES = Set.of("profile", "app");
    static final Set<String> LAYOUTS = Set.of("classic", "sidebar-left");
    static final Set<String> MODES = Set.of("app", "custom");
    static final Set<String> GAPS = Set.of("s", "m", "l");
    private static final Pattern HEX = Pattern.compile("^#[0-9a-fA-F]{6}$");

    public void validate(ThemeDto theme) {
        if (theme == null) {
            throw new ContentValidationException("theme is required");
        }
        validateColors(theme.colors());

        if (theme.font() == null || !FONTS.contains(theme.font())) {
            throw new ContentValidationException("Unsupported font: " + theme.font());
        }
        if (theme.headingFont() != null && !FONTS.contains(theme.headingFont())) {
            throw new ContentValidationException("Unsupported heading font: " + theme.headingFont());
        }
        if (theme.fontScope() != null && !FONT_SCOPES.contains(theme.fontScope())) {
            throw new ContentValidationException("Unsupported font scope: " + theme.fontScope());
        }
        if (theme.layout() == null || !LAYOUTS.contains(theme.layout())) {
            throw new ContentValidationException("Unsupported layout: " + theme.layout());
        }
        // Null mode means "app" (backward compatible with profiles saved before
        // the follow-app-theme option existed).
        if (theme.mode() != null && !MODES.contains(theme.mode())) {
            throw new ContentValidationException("Unsupported theme mode: " + theme.mode());
        }
        if (theme.widgetGap() != null && !GAPS.contains(theme.widgetGap())) {
            throw new ContentValidationException("Unsupported widget gap: " + theme.widgetGap());
        }
    }

    private void validateColors(Map<String, String> colors) {
        if (colors == null) {
            throw new ContentValidationException("theme.colors is required");
        }
        for (String key : COLOR_KEYS) {
            if (!colors.containsKey(key)) {
                throw new ContentValidationException("Missing color: " + key);
            }
        }
        for (Map.Entry<String, String> entry : colors.entrySet()) {
            if (!COLOR_KEYS.contains(entry.getKey())) {
                throw new ContentValidationException("Unknown color key: " + entry.getKey());
            }
            String value = entry.getValue();
            if (value == null || !HEX.matcher(value).matches()) {
                throw new ContentValidationException(
                        "Invalid color value for " + entry.getKey() + " (expected #rrggbb)");
            }
        }
    }
}
