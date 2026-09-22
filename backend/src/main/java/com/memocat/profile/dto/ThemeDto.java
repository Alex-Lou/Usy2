package com.memocat.profile.dto;

import java.util.Map;

/**
 * Theme contract, mapped 1:1 onto frontend CSS tokens.
 * colors: keys among {bg, surface, primary, text}, hex values only.
 * font: allowlisted key. layout: allowlisted key.
 */
public record ThemeDto(Map<String, String> colors, String font, String layout) {
}
