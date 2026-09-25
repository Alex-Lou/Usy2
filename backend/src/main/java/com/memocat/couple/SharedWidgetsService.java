package com.memocat.couple;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.dto.SharedWidgetsDto;
import com.memocat.domain.CoupleSettings;
import com.memocat.domain.User;
import com.memocat.profile.ProfileService;
import com.memocat.profile.WidgetValidator;
import com.memocat.profile.dto.WidgetDto;
import com.memocat.repository.CoupleSettingsRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * The widgets shown in both side menus: one list the two can edit, plus the
 * profile widgets their owners also show there (read-only here). Same content rules as profile widgets. Each change
 * bumps a version and a save made from an older copy is refused (409), so one
 * person's edit never silently erases the other's.
 */
@Service
public class SharedWidgetsService {

    private final CoupleSettingsRepository settings;
    private final UserRepository users;
    private final WidgetValidator validator;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher events;
    private final ProfileService profiles;

    public SharedWidgetsService(CoupleSettingsRepository settings, UserRepository users, WidgetValidator validator,
                                ObjectMapper objectMapper, ApplicationEventPublisher events, ProfileService profiles) {
        this.settings = settings;
        this.users = users;
        this.validator = validator;
        this.objectMapper = objectMapper;
        this.events = events;
        this.profiles = profiles;
    }

    @Transactional(readOnly = true)
    public SharedWidgetsDto get() {
        return settings.findById(CoupleSettings.SINGLETON_ID)
                .map(this::toDto)
                .orElseGet(() -> new SharedWidgetsDto(List.of(), 0, profiles.linkedWidgets()));
    }

    /** Replaces the list, if nobody changed it since {@code version}. */
    @Transactional
    public SharedWidgetsDto save(String username, List<WidgetDto> widgets, Integer version) {
        User me = requireUser(username);
        if (version == null) {
            throw new ContentValidationException("version is required");
        }
        List<WidgetDto> clean = validated(widgets);
        CoupleSettings s = lockedSettings();
        if (s.getWidgetsVersion() != version) {
            throw new ConflictException("Les widgets ont été modifiés entre-temps : recharge et recommence.");
        }
        return store(me, s, clean);
    }

    private SharedWidgetsDto store(User me, CoupleSettings s, List<WidgetDto> widgets) {
        s.replaceWidgets(writeJson(widgets));
        settings.save(s);
        events.publishEvent(CoupleActivity.of(CoupleActivity.WIDGETS, me, null, null));
        return toDto(s);
    }

    /** Checked like profile widgets; the profile-only "home" flag is dropped. */
    private List<WidgetDto> validated(List<WidgetDto> widgets) {
        validator.validate(widgets);
        return widgets.stream()
                .map(w -> new WidgetDto(w.type(), w.text(), w.emoji(), w.label(), w.assetId(), w.date(), w.variant(),
                        w.pins(), null))
                .toList();
    }

    /** The settings row (created by migration V17; created here only if it was ever removed). */
    private CoupleSettings lockedSettings() {
        return settings.findForUpdate(CoupleSettings.SINGLETON_ID)
                .orElseGet(() -> settings.saveAndFlush(CoupleSettings.create()));
    }

    private SharedWidgetsDto toDto(CoupleSettings s) {
        return new SharedWidgetsDto(read(s), s.getWidgetsVersion(), profiles.linkedWidgets());
    }

    private List<WidgetDto> read(CoupleSettings s) {
        try {
            return objectMapper.readValue(s.getWidgetsJson(), new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to read stored shared widgets", e);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize shared widgets", e);
        }
    }

    private User requireUser(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
