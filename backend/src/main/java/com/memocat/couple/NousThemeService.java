package com.memocat.couple;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.dto.NousThemeDto;
import com.memocat.domain.Asset;
import com.memocat.domain.CoupleSettings;
import com.memocat.domain.User;
import com.memocat.profile.StyleValidator;
import com.memocat.profile.dto.PartStyleDto;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.CoupleSettingsRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;

/**
 * The look of "Notre profil", editable by both. Its parts follow the same
 * closed rules as a profile's (hex colours, allowlisted choices), so nothing
 * can inject CSS; a background photo must be an image sent in the app.
 */
@Service
public class NousThemeService {

    static final Set<String> PARTS = Set.of("page", "cards");
    private static final NousThemeDto EMPTY = new NousThemeDto(null);

    private final CoupleSettingsRepository settings;
    private final AssetRepository assets;
    private final UserRepository users;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher events;

    public NousThemeService(CoupleSettingsRepository settings, AssetRepository assets, UserRepository users,
                            ObjectMapper objectMapper, ApplicationEventPublisher events) {
        this.settings = settings;
        this.assets = assets;
        this.users = users;
        this.objectMapper = objectMapper;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public NousThemeDto get() {
        return settings.findById(CoupleSettings.SINGLETON_ID).map(this::read).orElse(EMPTY);
    }

    @Transactional
    public NousThemeDto save(String username, NousThemeDto request) {
        User me = users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Map<String, PartStyleDto> parts = request == null ? null : request.parts();
        if (parts != null) {
            for (Map.Entry<String, PartStyleDto> entry : parts.entrySet()) {
                if (!PARTS.contains(entry.getKey())) {
                    throw new ContentValidationException("Unknown part: " + entry.getKey());
                }
                StyleValidator.validate(entry.getValue(), "page".equals(entry.getKey()));
            }
            PartStyleDto page = parts.get("page");
            if (page != null && page.photoAssetId() != null) {
                Asset asset = assets.findById(page.photoAssetId()).orElse(null);
                if (asset == null || asset.getContentType() == null || !asset.getContentType().startsWith("image/")) {
                    throw new ContentValidationException("Le fond photo doit être une image envoyée dans l'app");
                }
            }
        }
        CoupleSettings s = settings.findForUpdate(CoupleSettings.SINGLETON_ID)
                .orElseGet(() -> settings.saveAndFlush(CoupleSettings.create()));
        NousThemeDto clean = parts == null || parts.isEmpty() ? EMPTY : new NousThemeDto(parts);
        s.setNousThemeJson(clean == EMPTY ? null : write(clean));
        events.publishEvent(CoupleActivity.of(CoupleActivity.APPEARANCE, me, null, null));
        return clean;
    }

    private NousThemeDto read(CoupleSettings s) {
        if (s.getNousThemeJson() == null) {
            return EMPTY;
        }
        try {
            return objectMapper.readValue(s.getNousThemeJson(), NousThemeDto.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to read the Nous theme", e);
        }
    }

    private String write(NousThemeDto theme) {
        try {
            return objectMapper.writeValueAsString(theme);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize the Nous theme", e);
        }
    }
}
