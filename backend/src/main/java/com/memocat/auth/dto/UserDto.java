package com.memocat.auth.dto;

import com.memocat.domain.User;

/**
 * Public view of a user. Never exposes the password hash.
 */
public record UserDto(Long id, String username, String displayName, Long avatarAssetId, String companion) {

    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getUsername(), user.getDisplayName(),
                user.getAvatarAssetId(), user.getCompanion());
    }
}
