package com.memocat.couple;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.dto.NousThemeDto;
import com.memocat.domain.Asset;
import com.memocat.domain.CoupleSettings;
import com.memocat.domain.User;
import com.memocat.profile.dto.PartStyleDto;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.CoupleSettingsRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class NousThemeServiceTest {

    private final CoupleSettingsRepository settings = mock(CoupleSettingsRepository.class);
    private final AssetRepository assets = mock(AssetRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final NousThemeService service = new NousThemeService(settings, assets, users, new ObjectMapper(), events);
    private final User lou = new User("lou", "hash", "Lou");
    private final CoupleSettings row = CoupleSettings.create();

    private static PartStyleDto look(String bg, Long photo) {
        return new PartStyleDto(bg, null, null, "#ffffff", null, null, null, "round", null, null, null, null, null, null,
                photo, photo == null ? null : 40);
    }

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(lou, "id", 1L);
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(settings.findForUpdate(CoupleSettings.SINGLETON_ID)).thenReturn(Optional.of(row));
        when(settings.findById(CoupleSettings.SINGLETON_ID)).thenReturn(Optional.of(row));
    }

    @Test
    void ourSpaceKeepsItsOwnLookAndBothScreensFollow() {
        when(assets.findById(7L)).thenReturn(Optional.of(new Asset("k", "p.jpg", "image/jpeg", 1, lou)));
        NousThemeDto saved = service.save("lou", new NousThemeDto(Map.of("page", look("#16301f", 7L), "cards", look("#1f3b26", null))));

        assertThat(service.get()).isEqualTo(saved);
        assertThat(service.get().parts().get("page").photoAssetId()).isEqualTo(7L);
        ArgumentCaptor<CoupleActivity> activity = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events).publishEvent(activity.capture());
        assertThat(activity.getValue().kind()).isEqualTo(CoupleActivity.APPEARANCE);

        assertThat(service.save("lou", new NousThemeDto(Map.of())).parts()).isNull();
        assertThat(row.getNousThemeJson()).isNull(); // back to the app's shared look
    }

    @Test
    void unknownPartsBadColoursAndNonImagesAreRefused() {
        when(assets.findById(9L)).thenReturn(Optional.of(new Asset("k", "doc.pdf", "application/pdf", 1, lou)));
        assertThatThrownBy(() -> service.save("lou", new NousThemeDto(Map.of("header", look("#000000", null)))))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.save("lou", new NousThemeDto(Map.of("page", look("red", null)))))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.save("lou", new NousThemeDto(Map.of("cards", look("#000000", 7L)))))
                .isInstanceOf(ContentValidationException.class); // only the page has a photo
        assertThatThrownBy(() -> service.save("lou", new NousThemeDto(Map.of("page", look("#000000", 9L)))))
                .isInstanceOf(ContentValidationException.class);
        verify(events, never()).publishEvent(any());
    }
}
