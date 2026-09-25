package com.memocat.profile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.asset.Framing;
import com.memocat.domain.Asset;
import com.memocat.domain.Profile;
import com.memocat.domain.User;
import com.memocat.couple.CoupleActivity;
import com.memocat.profile.dto.LinkedWidgetDto;
import com.memocat.profile.dto.ProfileDto;
import com.memocat.profile.dto.ProfileUpdateRequest;
import com.memocat.profile.dto.SidebarPrefsDto;
import com.memocat.profile.dto.ThemeDto;
import com.memocat.profile.dto.WidgetDto;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.ProfileRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ProfileService {

    static final Set<String> COMPANIONS = Set.of(
            "cat", "dog", "wolf", "rabbit", "lizard", "raccoon", "capybara", "robin", "parrot", "penguin");
    private static final int MAX_BIO = 200;

    private static final ThemeDto DEFAULT_THEME = new ThemeDto(
            Map.of(
                    "bg", "#f4f1ea",
                    "surface", "#ffffff",
                    "primary", "#b5476b",
                    "text", "#2b2a28"),
            "trebuchet",
            "classic",
            "app");

    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final ThemeValidator themeValidator;
    private final WidgetValidator widgetValidator;
    private final ObjectMapper objectMapper;
    private final AssetRepository assetRepository;
    private final ApplicationEventPublisher events;

    public ProfileService(ProfileRepository profileRepository,
                          UserRepository userRepository,
                          ThemeValidator themeValidator,
                          WidgetValidator widgetValidator,
                          ObjectMapper objectMapper,
                          AssetRepository assetRepository,
                          ApplicationEventPublisher events) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.themeValidator = themeValidator;
        this.widgetValidator = widgetValidator;
        this.objectMapper = objectMapper;
        this.assetRepository = assetRepository;
        this.events = events;
    }

    @Transactional
    public ProfileDto getMyProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toDto(getOrCreate(user));
    }

    @Transactional
    public ProfileDto getProfileByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toDto(getOrCreate(user));
    }

    /** All profiles (both members of the couple) — used by the home "us" strip. */
    @Transactional
    public List<ProfileDto> getAllProfiles() {
        return userRepository.findAll().stream()
                .map(u -> toDto(getOrCreate(u)))
                .toList();
    }

    @Transactional
    public ProfileDto updateMyProfile(String username, ProfileUpdateRequest request) {
        themeValidator.validate(request.theme());
        widgetValidator.validate(request.widgets());

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.avatarAssetId() != null && request.avatarAssetId() <= 0) {
            throw new ContentValidationException("Invalid avatar");
        }
        String bio = request.bio() == null ? null : request.bio().strip();
        if (bio != null && bio.length() > MAX_BIO) {
            throw new ContentValidationException("Bio too long (max " + MAX_BIO + ")");
        }

        Long cover = request.coverAssetId();
        if (cover != null) {
            Asset asset = assetRepository.findById(cover)
                    .orElseThrow(() -> new ContentValidationException("Photo de couverture introuvable"));
            if (!asset.getUploader().getId().equals(user.getId()) || !asset.getContentType().startsWith("image/")) {
                throw new ContentValidationException("La couverture doit être une de tes photos");
            }
        }

        Long pagePhoto = pagePhotoOf(request.theme());
        if (pagePhoto != null) {
            Asset asset = assetRepository.findById(pagePhoto)
                    .orElseThrow(() -> new ContentValidationException("Photo de fond introuvable"));
            if (!asset.getUploader().getId().equals(user.getId()) || !asset.getContentType().startsWith("image/")) {
                throw new ContentValidationException("La photo de fond doit être une de tes photos");
            }
        }

        user.setAvatarAssetId(request.avatarAssetId());
        user.setAvatarFraming(request.avatarAssetId() == null ? null : Framing.validate(request.avatarFraming()));
        userRepository.save(user);

        Profile profile = getOrCreate(user);
        List<WidgetDto> linkedBefore = linkedOf(readWidgets(profile));
        // Glass and side menu choices change only through their own endpoints:
        // a profile save (maybe from an older page) keeps what is stored.
        ThemeDto stored = readJson(profile.getThemeJson(), new TypeReference<ThemeDto>() {
        });
        ThemeDto theme = request.theme().withGlass(stored.glass()).withSidebar(stored.sidebar());
        profile.setCoverAssetId(cover);
        profile.setCoverFraming(cover == null ? null : Framing.validate(request.coverFraming()));
        profile.setThemeJson(writeJson(theme));
        profile.setWidgetsJson(writeJson(request.widgets()));
        profile.setBio(bio == null || bio.isBlank() ? null : bio);
        ProfileDto saved = toDto(profileRepository.save(profile));
        if (!linkedBefore.equals(linkedOf(request.widgets()))) {
            // Both side menus show these: they reload, live.
            events.publishEvent(CoupleActivity.of(CoupleActivity.WIDGETS, user, null, null));
        }
        return saved;
    }

    /** My glass choice, kept with my theme (see ThemeDto.glass). */
    @Transactional
    public ProfileDto updateGlass(String username, String glass) {
        themeValidator.validateGlass(glass);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Profile profile = getOrCreate(user);
        ThemeDto theme = readJson(profile.getThemeJson(), new TypeReference<ThemeDto>() {
        });
        profile.setThemeJson(writeJson(theme.withGlass(glass)));
        return toDto(profileRepository.save(profile));
    }

    /** My own side menu choices, kept with my theme (see ThemeDto.sidebar). */
    @Transactional
    public ProfileDto updateSidebar(String username, SidebarPrefsDto prefs) {
        themeValidator.validateSidebar(prefs);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Profile profile = getOrCreate(user);
        ThemeDto theme = readJson(profile.getThemeJson(), new TypeReference<ThemeDto>() {
        });
        profile.setThemeJson(writeJson(theme.withSidebar(prefs)));
        return toDto(profileRepository.save(profile));
    }

    /**
     * The widgets both profiles also show in the side menus, as the menus show
     * them (no profile size, look or flags). Existing profiles only: reading
     * never creates one.
     */
    @Transactional(readOnly = true)
    public List<LinkedWidgetDto> linkedWidgets() {
        return profileRepository.findAll().stream()
                .sorted(Comparator.comparing(p -> p.getUser().getId()))
                .flatMap(p -> linkedOf(readWidgets(p)).stream()
                        .map(w -> new LinkedWidgetDto(p.getUser().getId(), p.getUser().getDisplayName(), w)))
                .toList();
    }

    /** The side-menu copies of the widgets flagged {@code sidebar}. */
    private static List<WidgetDto> linkedOf(List<WidgetDto> widgets) {
        return widgets.stream()
                .filter(w -> Boolean.TRUE.equals(w.sidebar()))
                .map(w -> new WidgetDto(w.type(), w.text(), w.emoji(), w.label(), w.assetId(), w.date(), w.variant(),
                        w.pins(), null))
                .toList();
    }

    private List<WidgetDto> readWidgets(Profile profile) {
        return readJson(profile.getWidgetsJson(), new TypeReference<>() {
        });
    }

    private static Long pagePhotoOf(ThemeDto theme) {
        if (theme.parts() == null || theme.parts().get("page") == null) {
            return null;
        }
        return theme.parts().get("page").photoAssetId();
    }

    @Transactional
    public ProfileDto updateCompanion(String username, String companion) {
        if (companion == null || !COMPANIONS.contains(companion)) {
            throw new ContentValidationException("Unknown companion: " + companion);
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setCompanion(companion);
        userRepository.save(user);
        return toDto(getOrCreate(user));
    }

    /** The user's profile, created on first use (safe if two first uses race). */
    private Profile getOrCreate(User user) {
        return profileRepository.findByUserId(user.getId()).orElseGet(() -> {
            profileRepository.createIfAbsent(user.getId(), writeJson(DEFAULT_THEME));
            return profileRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new IllegalStateException("Profile not created for user " + user.getId()));
        });
    }

    private ProfileDto toDto(Profile profile) {
        ThemeDto theme = readJson(profile.getThemeJson(), new TypeReference<>() {
        });
        List<WidgetDto> widgets = readJson(profile.getWidgetsJson(), new TypeReference<>() {
        });
        User user = profile.getUser();
        return new ProfileDto(
                user.getId(),
                user.getDisplayName(),
                user.getAvatarAssetId(),
                user.getCompanion(),
                profile.getBio(),
                theme,
                widgets,
                profile.getCoverAssetId(),
                user.getAvatarFraming(),
                profile.getCoverFraming());
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize profile content", e);
        }
    }

    private <T> T readJson(String json, TypeReference<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to read stored profile content", e);
        }
    }
}
