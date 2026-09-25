package com.memocat.couple.dto;

import com.memocat.profile.dto.LinkedWidgetDto;
import com.memocat.profile.dto.WidgetDto;

import java.util.List;

/**
 * The side menus' widgets: the common ones, editable by both, with their
 * version (sent back when saving); and the profile widgets each owner also
 * shows there ({@code linked}, read-only here, managed on the profile).
 */
public record SharedWidgetsDto(List<WidgetDto> widgets, int version, List<LinkedWidgetDto> linked) {

    public SharedWidgetsDto(List<WidgetDto> widgets, int version) {
        this(widgets, version, List.of());
    }
}
