package com.memocat.profile.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * A single curated widget. Fields used depend on {@code type}:
 * - marquee / quote: {@code text}
 * - mood: {@code emoji} (+ optional {@code label})
 * Image-based widgets (banner, sticker) are deferred to Tranche 3.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record WidgetDto(String type, String text, String emoji, String label) {
}
