package com.memocat.profile;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.CoupleActivity;
import com.memocat.domain.Profile;
import com.memocat.domain.User;
import com.memocat.profile.dto.LinkedWidgetDto;
import com.memocat.profile.dto.PartStyleDto;
import com.memocat.profile.dto.ProfileUpdateRequest;
import com.memocat.profile.dto.SidebarPrefsDto;
import com.memocat.profile.dto.ThemeDto;
import com.memocat.profile.dto.WidgetDto;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.ProfileRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Profile widgets shown in the side menus (linked, live) and the glass choice. */
class ProfileSidebarTest {

    private final ProfileRepository profiles = mock(ProfileRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final ObjectMapper json = new ObjectMapper();
    private final ProfileService service = new ProfileService(profiles, users, new ThemeValidator(), new WidgetValidator(),
            json, mock(AssetRepository.class), events);
    private final User lou = withId(new User("lou", "h", "Lou"), 1L);
    private final User sam = withId(new User("sam", "h", "Sam"), 2L);
    private final ThemeDto theme = new ThemeDto(
            Map.of("bg", "#f4f1ea", "surface", "#ffffff", "primary", "#b5476b", "text", "#2b2a28"), "trebuchet", "classic", "app");
    private Profile lousProfile;

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }

    private static WidgetDto quote(String text, Boolean sidebar) {
        PartStyleDto look = new PartStyleDto("#112233", null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null);
        return new WidgetDto("quote", text, null, null, null, null, null, null, null, 2, 1, look, sidebar);
    }

    private static WidgetDto asInMenu(String text) {
        return new WidgetDto("quote", text, null, null, null, null, null, null, null);
    }

    private void save(WidgetDto... widgets) {
        service.updateMyProfile("lou", new ProfileUpdateRequest(theme, List.of(widgets), null, null, null));
    }

    @BeforeEach
    void setUp() {
        lousProfile = new Profile(lou, "{}", "[]");
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(profiles.findByUserId(1L)).thenReturn(Optional.of(lousProfile));
        when(profiles.save(any(Profile.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void onlyFlaggedWidgetsReachTheMenusWithoutTheirProfileSizeOrLook() throws Exception {
        save(quote("Au menu", true), quote("Juste le profil", false), quote("Sans choix", null));
        Profile samsProfile = new Profile(sam, json.writeValueAsString(theme), json.writeValueAsString(List.of(quote("De Sam", true))));
        when(profiles.findAll()).thenReturn(List.of(samsProfile, lousProfile));

        assertThat(service.linkedWidgets()).containsExactly(
                new LinkedWidgetDto(1L, "Lou", asInMenu("Au menu")),
                new LinkedWidgetDto(2L, "Sam", asInMenu("De Sam")));
    }

    @Test
    void bothMenusReloadWhenAFlaggedWidgetChangesComesOrGoes() {
        save(quote("A", true));
        ArgumentCaptor<CoupleActivity> activity = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events).publishEvent(activity.capture());
        assertThat(activity.getValue().kind()).isEqualTo(CoupleActivity.WIDGETS);

        clearInvocations(events);
        save(quote("A", true), quote("B", false)); // an unflagged widget: the menus do not change
        verify(events, never()).publishEvent(any());

        save(quote("A modifié", true), quote("B", false));
        verify(events).publishEvent(any(CoupleActivity.class));

        clearInvocations(events);
        save(quote("B", false)); // removed from the profile: gone from the menus
        verify(events).publishEvent(any(CoupleActivity.class));

        clearInvocations(events);
        save(quote("B", false));
        verify(events, never()).publishEvent(any());
    }

    @Test
    void theGlassChoiceIsKeptWithTheThemeAndChecked() throws Exception {
        lousProfile.setThemeJson(json.writeValueAsString(theme));

        assertThat(service.updateGlass("lou", "strong").theme().glass()).isEqualTo("strong");
        assertThat(service.updateGlass("lou", null).theme().glass()).isNull();
        assertThat(service.getMyProfile("lou").theme().font()).isEqualTo("trebuchet"); // the rest of the theme stays
        assertThatThrownBy(() -> service.updateGlass("lou", "opaque")).isInstanceOf(ContentValidationException.class);
    }

    @Test
    void mySideMenuChoicesAreKeptWithTheThemeAndChecked() throws Exception {
        lousProfile.setThemeJson(json.writeValueAsString(theme));
        SidebarPrefsDto prefs = new SidebarPrefsDto(List.of("c:abc123", "l:2:z9"), List.of("l:1:k2", "c:abc123"), true);

        assertThat(service.updateSidebar("lou", prefs).theme().sidebar()).isEqualTo(prefs);
        assertThat(service.getMyProfile("lou").theme().font()).isEqualTo("trebuchet"); // the rest of the theme stays

        for (String bad : List.of("x:abc", "c:ABC", "l:abc:1", "c:" + "a".repeat(17), "c:a b")) {
            assertThatThrownBy(() -> service.updateSidebar("lou", new SidebarPrefsDto(List.of(bad), null, null)))
                    .isInstanceOf(ContentValidationException.class);
        }
        List<String> tooMany = java.util.stream.IntStream.range(0, 61).mapToObj(i -> "c:k" + i).toList();
        assertThatThrownBy(() -> service.updateSidebar("lou", new SidebarPrefsDto(null, tooMany, null)))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void aProfileSaveKeepsTheStoredGlassAndSideMenuChoices() throws Exception {
        lousProfile.setThemeJson(json.writeValueAsString(theme));
        SidebarPrefsDto prefs = new SidebarPrefsDto(List.of("c:abc123"), null, null);
        service.updateSidebar("lou", prefs);
        service.updateGlass("lou", "strong");

        save(quote("A", false)); // sent from a page loaded before: no glass, no side menu choices
        var after = service.getMyProfile("lou").theme();
        assertThat(after.sidebar()).isEqualTo(prefs);
        assertThat(after.glass()).isEqualTo("strong");
    }

    @Test
    void aFirstVisitCreatesTheProfileAtomicallyInsteadOfSavingADuplicate() {
        User newcomer = withId(new User("nina", "h", "Nina"), 3L);
        Profile created = new Profile(newcomer, "{}", "[]");
        when(users.findByUsername("nina")).thenReturn(Optional.of(newcomer));
        when(profiles.findByUserId(3L)).thenReturn(Optional.empty(), Optional.of(created));

        assertThat(service.getMyProfile("nina").displayName()).isEqualTo("Nina");
        verify(profiles).createIfAbsent(org.mockito.ArgumentMatchers.eq(3L), any(String.class));
        verify(profiles, never()).save(any(Profile.class)); // no plain insert that could collide
    }
}
