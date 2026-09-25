package com.memocat.auth.dto;

import com.memocat.asset.Framing;
import com.memocat.domain.User;

/**
 * Public view of a user. Never exposes the password hash.
 */
public record UserDto(Long id, String username, String displayName, Long avatarAssetId, String companion,
                      Framing avatarFraming) {

    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getUsername(), user.getDisplayName(),
                user.getAvatarAssetId(), user.getCompanion(), user.getAvatarFraming());
    }
}
