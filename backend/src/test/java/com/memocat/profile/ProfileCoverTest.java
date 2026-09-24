package com.memocat.profile;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.asset.Framing;
import com.memocat.domain.Asset;
import com.memocat.domain.Profile;
import com.memocat.domain.User;
import com.memocat.profile.dto.ProfileUpdateRequest;
import com.memocat.profile.dto.ThemeDto;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.ProfileRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ProfileCoverTest {

    private final ProfileRepository profiles = mock(ProfileRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final AssetRepository assets = mock(AssetRepository.class);
    private final ProfileService service = new ProfileService(profiles, users, new ThemeValidator(), new WidgetValidator(),
            new ObjectMapper(), assets);
    private final User lou = withId(new User("lou", "h", "Lou"), 1L);
    private final User sam = withId(new User("sam", "h", "Sam"), 2L);
    private final ThemeDto theme = new ThemeDto(
            Map.of("bg", "#f4f1ea", "surface", "#ffffff", "primary", "#b5476b", "text", "#2b2a28"), "trebuchet", "classic", "app");

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }

    @BeforeEach
    void setUp() {
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(profiles.findByUserId(1L)).thenReturn(Optional.of(new Profile(lou, "{}", "[]")));
        when(profiles.save(any(Profile.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private ProfileUpdateRequest withCover(Long cover) {
        return new ProfileUpdateRequest(theme, List.of(), null, null, cover);
    }

    @Test
    void myOwnPhotoBecomesTheCover() {
        when(assets.findById(7L)).thenReturn(Optional.of(new Asset("k", "c.jpg", "image/jpeg", 1, lou)));
        assertThat(service.updateMyProfile("lou", withCover(7L)).coverAssetId()).isEqualTo(7L);
        assertThat(service.updateMyProfile("lou", withCover(null)).coverAssetId()).isNull();
    }

    @Test
    void framingIsKeptWithItsPhotoAndDroppedWithoutOne() {
        when(assets.findById(7L)).thenReturn(Optional.of(new Asset("k", "c.jpg", "image/jpeg", 1, lou)));
        Framing top = new Framing(0.5, 0, 1.5);

        var saved = service.updateMyProfile("lou", new ProfileUpdateRequest(theme, List.of(), 5L, null, 7L, top, top));
        assertThat(saved.coverFraming()).isEqualTo(top);
        assertThat(saved.avatarFraming()).isEqualTo(top);

        var cleared = service.updateMyProfile("lou", new ProfileUpdateRequest(theme, List.of(), null, null, null, top, top));
        assertThat(cleared.coverFraming()).isNull();
        assertThat(cleared.avatarFraming()).isNull();

        assertThatThrownBy(() -> service.updateMyProfile("lou",
                new ProfileUpdateRequest(theme, List.of(), null, null, 7L, null, new Framing(0.5, 0.5, 20))))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void someoneElsesFileOrADocumentIsRefused() {
        when(assets.findById(8L)).thenReturn(Optional.of(new Asset("k", "c.jpg", "image/jpeg", 1, sam)));
        when(assets.findById(9L)).thenReturn(Optional.of(new Asset("k", "doc.pdf", "application/pdf", 1, lou)));
        assertThatThrownBy(() -> service.updateMyProfile("lou", withCover(8L))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.updateMyProfile("lou", withCover(9L))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.updateMyProfile("lou", withCover(99L))).isInstanceOf(ContentValidationException.class);
    }
}
