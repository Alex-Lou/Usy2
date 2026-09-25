package com.memocat.profile;

import com.memocat.domain.User;
import com.memocat.profile.dto.ColorModeDto;
import com.memocat.profile.dto.ReadingDto;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Each person's own reading settings for the messages (their screens only,
 * kept on the server so every device agrees). Fonts come from the same
 * allowlist as profile themes.
 */
@Service
public class ReadingService {

    public static final Set<String> SIZES = Set.of("s", "m", "l", "xl");
    static final Set<String> COLOR_MODES = Set.of("neo", "scrapbook");

    private final UserRepository users;

    public ReadingService(UserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public ReadingDto get(String username) {
        User me = requireUser(username);
        return new ReadingDto(me.getReadingFont(), me.getReadingSize());
    }

    @Transactional
    public ReadingDto save(String username, ReadingDto request) {
        User me = requireUser(username);
        String font = request == null ? null : request.font();
        String size = request == null ? null : request.size();
        if (font != null && !ThemeValidator.FONTS.contains(font)) {
            throw new ContentValidationException("Unsupported font: " + font);
        }
        if (size != null && !SIZES.contains(size)) {
            throw new ContentValidationException("Unsupported size: " + size);
        }
        me.setReading("app".equals(font) ? null : font, "m".equals(size) ? null : size);
        return new ReadingDto(me.getReadingFont(), me.getReadingSize());
    }

    /** This person's light/dark look ("neo" or "scrapbook"), or null when never chosen. */
    @Transactional(readOnly = true)
    public ColorModeDto colorMode(String username) {
        return new ColorModeDto(requireUser(username).getColorMode());
    }

    @Transactional
    public ColorModeDto saveColorMode(String username, ColorModeDto request) {
        User me = requireUser(username);
        String mode = request == null ? null : request.mode();
        if (mode == null || !COLOR_MODES.contains(mode)) {
            throw new ContentValidationException("Unsupported color mode: " + mode);
        }
        me.setColorMode(mode);
        return new ColorModeDto(mode);
    }

    private User requireUser(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
