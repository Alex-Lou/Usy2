package com.memocat.couple;

import com.memocat.couple.dto.AppearanceDto;
import com.memocat.domain.Asset;
import com.memocat.domain.CoupleSettings;
import com.memocat.domain.User;
import com.memocat.profile.ReadingService;
import com.memocat.profile.ThemeValidator;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.CoupleSettingsRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.regex.Pattern;

/**
 * The shared look of the app, editable by both: general fonts, accent colour,
 * background, default font/size of the messages. Everything comes from closed
 * lists or a strict #rrggbb colour, so nothing can inject CSS.
 */
@Service
public class SharedAppearanceService {

    static final Set<String> BACKGROUNDS = Set.of("aurora", "sunset", "ocean", "forest", "night", "rose", "photo");
    private static final Pattern HEX = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private final CoupleSettingsRepository settings;
    private final AssetRepository assets;
    private final UserRepository users;
    private final ApplicationEventPublisher events;

    public SharedAppearanceService(CoupleSettingsRepository settings, AssetRepository assets, UserRepository users,
                                   ApplicationEventPublisher events) {
        this.settings = settings;
        this.assets = assets;
        this.users = users;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public AppearanceDto get() {
        return settings.findById(CoupleSettings.SINGLETON_ID).map(SharedAppearanceService::toDto)
                .orElse(new AppearanceDto(null, null, null, null, null, null, null));
    }

    @Transactional
    public AppearanceDto save(String username, AppearanceDto request) {
        User me = users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        AppearanceDto r = request == null ? new AppearanceDto(null, null, null, null, null, null, null) : request;
        String font = font(r.font());
        String headingFont = font(r.headingFont());
        String chatFont = font(r.chatFont());
        if (r.accent() != null && !HEX.matcher(r.accent()).matches()) {
            throw new ContentValidationException("Couleur invalide (attendu #rrggbb)");
        }
        if (r.chatSize() != null && !ReadingService.SIZES.contains(r.chatSize())) {
            throw new ContentValidationException("Taille inconnue");
        }
        if (r.background() != null && !BACKGROUNDS.contains(r.background())) {
            throw new ContentValidationException("Fond inconnu");
        }
        Long photo = null;
        if ("photo".equals(r.background())) {
            Asset asset = r.backgroundAssetId() == null ? null : assets.findById(r.backgroundAssetId()).orElse(null);
            if (asset == null || asset.getContentType() == null || !asset.getContentType().startsWith("image/")) {
                throw new ContentValidationException("Le fond photo doit être une image envoyée dans l'app");
            }
            photo = asset.getId();
        }
        CoupleSettings s = settings.findForUpdate(CoupleSettings.SINGLETON_ID)
                .orElseGet(() -> settings.saveAndFlush(CoupleSettings.create()));
        s.setAppearance(font, headingFont, r.accent() == null ? null : r.accent().toLowerCase(),
                r.background(), photo, chatFont, "m".equals(r.chatSize()) ? null : r.chatSize());
        events.publishEvent(CoupleActivity.of(CoupleActivity.APPEARANCE, me, null, null));
        return toDto(s);
    }

    /** A font from the app's list; "app" (the app's own) is stored as nothing. */
    private static String font(String key) {
        if (key == null || "app".equals(key)) {
            return null;
        }
        if (!ThemeValidator.FONTS.contains(key)) {
            throw new ContentValidationException("Police inconnue");
        }
        return key;
    }

    private static AppearanceDto toDto(CoupleSettings s) {
        return new AppearanceDto(s.getAppFont(), s.getAppHeadingFont(), s.getAccentColor(), s.getBackground(),
                s.getBackgroundAssetId(), s.getChatFont(), s.getChatSize());
    }
}
