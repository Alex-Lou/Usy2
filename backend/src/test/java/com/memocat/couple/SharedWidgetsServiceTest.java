package com.memocat.couple;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.dto.SharedWidgetsDto;
import com.memocat.domain.CoupleSettings;
import com.memocat.domain.User;
import com.memocat.profile.ProfileService;
import com.memocat.profile.WidgetValidator;
import com.memocat.profile.dto.LinkedWidgetDto;
import com.memocat.profile.dto.WidgetDto;
import com.memocat.repository.CoupleSettingsRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SharedWidgetsServiceTest {

    @Mock private CoupleSettingsRepository settings;
    @Mock private UserRepository users;
    @Mock private ApplicationEventPublisher events;
    @Mock private ProfileService profiles;

    private SharedWidgetsService service;
    private CoupleSettings row;
    private final User sam = user(2, "sam", "Sam");

    private static User user(long id, String username, String name) {
        User u = new User(username, "hash", name);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private static WidgetDto quote(String text, Boolean home) {
        return new WidgetDto("quote", text, null, null, null, null, null, null, home);
    }

    @BeforeEach
    void setUp() {
        service = new SharedWidgetsService(settings, users, new WidgetValidator(), new ObjectMapper(), events, profiles);
        lenient().when(profiles.linkedWidgets()).thenReturn(List.of());
        row = CoupleSettings.create();
        lenient().when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
        lenient().when(settings.findById(CoupleSettings.SINGLETON_ID)).thenReturn(Optional.of(row));
        lenient().when(settings.findForUpdate(CoupleSettings.SINGLETON_ID)).thenReturn(Optional.of(row));
    }

    @Test
    void savingReplacesTheListBumpsTheVersionAndSyncsBothMenus() {
        SharedWidgetsDto saved = service.save("sam", List.of(quote("Nous deux", true)), 0);

        assertThat(saved.version()).isEqualTo(1);
        assertThat(saved.widgets()).containsExactly(quote("Nous deux", null)); // "home" is a profile-only flag
        assertThat(service.get()).isEqualTo(saved);
        ArgumentCaptor<CoupleActivity> activity = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events).publishEvent(activity.capture());
        assertThat(activity.getValue().kind()).isEqualTo(CoupleActivity.WIDGETS);
        assertThat(activity.getValue().actorId()).isEqualTo(2L);
    }

    @Test
    void savingAnOlderCopyIsRefusedInsteadOfErasingTheOtherPersonsChange() {
        service.save("sam", List.of(quote("A", null)), 0);

        assertThatThrownBy(() -> service.save("sam", List.of(quote("B", null)), 0))
                .isInstanceOf(ConflictException.class);
        assertThat(service.get().widgets()).containsExactly(quote("A", null));
    }

    @Test
    void contentFollowsTheProfileWidgetRules() {
        assertThatThrownBy(() -> service.save("sam", List.of(new WidgetDto("script", "x", null, null, null, null, null)), 0))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.save("sam", List.of(), null)).isInstanceOf(ContentValidationException.class);
        verify(settings, never()).save(any());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void theMenusAlsoListTheWidgetsBothProfilesShowThere() {
        LinkedWidgetDto lous = new LinkedWidgetDto(1L, "Lou", quote("De mon profil", null));
        when(profiles.linkedWidgets()).thenReturn(List.of(lous));

        assertThat(service.get().linked()).containsExactly(lous);
        assertThat(service.save("sam", List.of(quote("Commun", null)), 0).linked()).containsExactly(lous);
    }
}
