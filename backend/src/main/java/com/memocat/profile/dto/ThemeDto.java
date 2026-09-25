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
 * parts: the look of each part of the profile, keyed "page", "header",
 *       "tabs" and "widgets" (the frames' default); see PartStyleDto. Null or
 *       absent parts keep their usual look.
 * glass: how see-through the cards get over a chosen background, for the
 *       profile's owner only: "off", "light", "medium" or "strong" (null: "medium").
 */
public record ThemeDto(Map<String, String> colors, String font, String layout, String mode,
                       String headingFont, String fontScope, String widgetGap,
                       Map<String, PartStyleDto> parts, String glass) {

    public ThemeDto(Map<String, String> colors, String font, String layout, String mode) {
        this(colors, font, layout, mode, null, null, null, null, null);
    }

    public ThemeDto(Map<String, String> colors, String font, String layout, String mode,
                    String headingFont, String fontScope) {
        this(colors, font, layout, mode, headingFont, fontScope, null, null, null);
    }

    public ThemeDto(Map<String, String> colors, String font, String layout, String mode,
                    String headingFont, String fontScope, String widgetGap) {
        this(colors, font, layout, mode, headingFont, fontScope, widgetGap, null, null);
    }

    public ThemeDto(Map<String, String> colors, String font, String layout, String mode,
                    String headingFont, String fontScope, String widgetGap, Map<String, PartStyleDto> parts) {
        this(colors, font, layout, mode, headingFont, fontScope, widgetGap, parts, null);
    }

    /** The same theme with another glass choice. */
    public ThemeDto withGlass(String value) {
        return new ThemeDto(colors, font, layout, mode, headingFont, fontScope, widgetGap, parts, value);
    }
}
