package com.memocat.couple.dto;

import com.memocat.profile.dto.WidgetDto;

import java.util.List;

/** The couple's side-menu widgets and their version (sent back when saving). */
public record SharedWidgetsDto(List<WidgetDto> widgets, int version) {
}
