package com.memocat.profile.dto;

/**
 * A profile widget its owner also shows in both side menus: it stays on the
 * profile, and leaves the menus when its owner removes it or turns this off.
 */
public record LinkedWidgetDto(Long ownerId, String ownerName, WidgetDto widget) {
}
