package com.memocat.profile.dto;

import com.memocat.asset.Framing;
import java.util.List;

public record ProfileDto(
        Long userId,
        String displayName,
        Long avatarAssetId,
        String companion,
        String bio,
        ThemeDto theme,
        List<WidgetDto> widgets,
        Long coverAssetId,
        Framing avatarFraming,
        Framing coverFraming) {
}
