package com.memocat.profile.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * A single curated widget. Fields used depend on {@code type}:
 * - marquee / quote / richtext: {@code text}
 * - mood: {@code emoji} (+ optional {@code label})
 * - clock: optional {@code label}
 * - countdown: {@code date} (ISO) (+ optional {@code label})
 * - image: {@code assetId} (+ optional {@code label} caption)
 * - svg: {@code variant} (+ optional {@code label})
 * - pins: {@code pins}, quick links to web pages (+ optional {@code label} title)
 * Any widget: {@code home} = also shown at the top of the home feed;
 * {@code w} / {@code h} = its size on the profile, in grid cells (1..4; null:
 * the default width, and a height that follows the content).
 *
 * All text is stored as-is and escaped/whitelisted on display, never injected
 * as raw HTML — the widget set stays a closed, safe allowlist (no XSS vector).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record WidgetDto(String type, String text, String emoji, String label,
                        Long assetId, String date, String variant, List<PinDto> pins, Boolean home,
                        Integer w, Integer h) {

    /** Any widget, without a size of its own. */
    public WidgetDto(String type, String text, String emoji, String label, Long assetId, String date, String variant,
                     List<PinDto> pins, Boolean home) {
        this(type, text, emoji, label, assetId, date, variant, pins, home, null, null);
    }

    /** Every widget type but "pins", not on the home feed. */
    public WidgetDto(String type, String text, String emoji, String label, Long assetId, String date, String variant) {
        this(type, text, emoji, label, assetId, date, variant, null, null, null, null);
    }

    /** Any widget, not on the home feed. */
    public WidgetDto(String type, String text, String emoji, String label, Long assetId, String date, String variant,
                     List<PinDto> pins) {
        this(type, text, emoji, label, assetId, date, variant, pins, null, null, null);
    }

    /** A pinned web page: its address and an optional short name. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PinDto(String url, String label) {
    }
}
