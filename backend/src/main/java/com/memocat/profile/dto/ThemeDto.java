package com.memocat.profile.dto;

import java.util.Map;

/**
 * Theme contract, mapped 1:1 onto frontend CSS tokens.
 * colors: keys among {bg, surface, primary, text}, hex values only.
 * font: allowlisted key. layout: allowlisted key.
 * mode: "app" (follow the app light/dark theme, default) or "custom" (use the
 *       stored colors). Null is treated as "app" for backward compatibility.
 * font / headingFont: text and title fonts, allowlisted keys ("app" = the
 *       app's own font). headingFont null = the app's title font.
 * fontScope: "profile" (fonts on the profile page) or "app" (also the whole
 *       app for its owner). Null = saved before this choice existed: the font
 *       then only applies with custom colors, as it always did.
 * widgetGap: space between the profile's widgets, "s", "m" or "l" (null: "m").
 */
public record ThemeDto(Map<String, String> colors, String font, String layout, String mode,
                       String headingFont, String fontScope, String widgetGap) {

    public ThemeDto(Map<String, String> colors, String font, String layout, String mode) {
        this(colors, font, layout, mode, null, null, null);
    }

    public ThemeDto(Map<String, String> colors, String font, String layout, String mode,
                    String headingFont, String fontScope) {
        this(colors, font, layout, mode, headingFont, fontScope, null);
    }
}
