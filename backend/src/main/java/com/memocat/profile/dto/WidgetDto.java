package com.memocat.profile.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * A single curated widget. Fields used depend on {@code type}:
 * - marquee / quote / richtext: {@code text}
 * - mood: {@code emoji} (+ optional {@code label})
 * - clock: optional {@code label}
 * - countdown: {@code date} (ISO) (+ optional {@code label})
 * - image: {@code assetId} (+ optional {@code label} caption)
 * - svg: {@code variant} (+ optional {@code label})
 *
 * All text is stored as-is and escaped/whitelisted on display, never injected
 * as raw HTML — the widget set stays a closed, safe allowlist (no XSS vector).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record WidgetDto(String type, String text, String emoji, String label,
                        Long assetId, String date, String variant) {
}
