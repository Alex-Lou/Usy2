package com.memocat.profile.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ProfileUpdateRequest(
        @NotNull ThemeDto theme,
        @NotNull List<WidgetDto> widgets) {
}
