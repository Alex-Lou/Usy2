package com.memocat.profile.dto;

import java.util.List;

public record ProfileDto(Long userId, String displayName, ThemeDto theme, List<WidgetDto> widgets) {
}
