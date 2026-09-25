package com.memocat.profile.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * My own side menu (only for me, on every device): the widgets I hide
 * ({@code hidden}), the order I chose ({@code order}), both as item keys
 * ("c:<hash>" a common widget, "l:<ownerId>:<hash>" a profile's), and
 * {@code off} to hide the whole widgets section.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SidebarPrefsDto(List<String> hidden, List<String> order, Boolean off) {
}
