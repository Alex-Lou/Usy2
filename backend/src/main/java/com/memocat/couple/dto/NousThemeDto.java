package com.memocat.couple.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.memocat.profile.dto.PartStyleDto;

import java.util.Map;

/**
 * The look of "Notre profil", for both: its parts, keyed "page" (the
 * background, possibly a photo) and "cards" (the space's cards). Same rules
 * as a profile part (see PartStyleDto). Null or empty: the app's shared look.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record NousThemeDto(Map<String, PartStyleDto> parts) {
}
