package com.memocat.profile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.domain.Profile;
import com.memocat.domain.User;
import com.memocat.profile.dto.ProfileDto;
import com.memocat.profile.dto.ProfileUpdateRequest;
import com.memocat.profile.dto.ThemeDto;
import com.memocat.profile.dto.WidgetDto;
import com.memocat.repository.ProfileRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class ProfileService {

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

    public ProfileService(ProfileRepository profileRepository,
                          UserRepository userRepository,
                          ThemeValidator themeValidator,
                          WidgetValidator widgetValidator,
                          ObjectMapper objectMapper) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.themeValidator = themeValidator;
        this.widgetValidator = widgetValidator;
        this.objectMapper = objectMapper;
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

    @Transactional
    public ProfileDto updateMyProfile(String username, ProfileUpdateRequest request) {
        themeValidator.validate(request.theme());
        widgetValidator.validate(request.widgets());

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Profile profile = getOrCreate(user);
        profile.setThemeJson(writeJson(request.theme()));
        profile.setWidgetsJson(writeJson(request.widgets()));
        return toDto(profileRepository.save(profile));
    }

    private Profile getOrCreate(User user) {
        return profileRepository.findByUserId(user.getId())
                .orElseGet(() -> profileRepository.save(
                        new Profile(user, writeJson(DEFAULT_THEME), "[]")));
    }

    private ProfileDto toDto(Profile profile) {
        ThemeDto theme = readJson(profile.getThemeJson(), new TypeReference<>() {
        });
        List<WidgetDto> widgets = readJson(profile.getWidgetsJson(), new TypeReference<>() {
        });
        return new ProfileDto(
                profile.getUser().getId(),
                profile.getUser().getDisplayName(),
                theme,
                widgets);
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
