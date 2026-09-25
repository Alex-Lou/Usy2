package com.memocat.couple;

import com.memocat.couple.dto.AppearanceDto;
import com.memocat.domain.Asset;
import com.memocat.domain.CoupleSettings;
import com.memocat.domain.User;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.CoupleSettingsRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SharedAppearanceServiceTest {

    @Mock private CoupleSettingsRepository settings;
    @Mock private AssetRepository assets;
    @Mock private UserRepository users;
    @Mock private ApplicationEventPublisher events;

    @InjectMocks
    private SharedAppearanceService service;

    private final User lou = new User("lou", "hash", "Lou");
    private final CoupleSettings row = CoupleSettings.create();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(lou, "id", 1L);
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(settings.findForUpdate(CoupleSettings.SINGLETON_ID)).thenReturn(Optional.of(row));
    }

    @Test
    void savesTheSharedLookAndSyncs() {
        AppearanceDto saved = service.save("lou", new AppearanceDto("nunito", "app", "#FF3D9A", "ocean", 9L, "caveat", "l"));

        assertThat(saved).isEqualTo(new AppearanceDto("nunito", null, "#ff3d9a", "ocean", null, "caveat", "l"));
        ArgumentCaptor<CoupleActivity> activity = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events).publishEvent(activity.capture());
        assertThat(activity.getValue().kind()).isEqualTo(CoupleActivity.APPEARANCE);
    }

    @Test
    void aPhotoBackgroundMustBeAnUploadedImage() {
        Asset photo = mock(Asset.class);
        when(photo.getId()).thenReturn(5L);
        when(photo.getContentType()).thenReturn("image/jpeg");
        when(assets.findById(5L)).thenReturn(Optional.of(photo));
        assertThat(service.save("lou", new AppearanceDto(null, null, null, "photo", 5L, null, null)).backgroundAssetId()).isEqualTo(5L);

        Asset pdf = mock(Asset.class);
        when(pdf.getContentType()).thenReturn("application/pdf");
        when(assets.findById(6L)).thenReturn(Optional.of(pdf));
        assertThatThrownBy(() -> service.save("lou", new AppearanceDto(null, null, null, "photo", 6L, null, null)))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.save("lou", new AppearanceDto(null, null, null, "photo", null, null, null)))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void anythingOutsideTheListsIsRefused() {
        for (AppearanceDto bad : new AppearanceDto[] {
                new AppearanceDto("Comic'; }", null, null, null, null, null, null),
                new AppearanceDto(null, null, "red", null, null, null, null),
                new AppearanceDto(null, null, "#ff3d9a; x", null, null, null, null),
                new AppearanceDto(null, null, null, "url(x)", null, null, null),
                new AppearanceDto(null, null, null, null, null, "nope", null),
                new AppearanceDto(null, null, null, null, null, null, "xxl")}) {
            assertThatThrownBy(() -> service.save("lou", bad)).isInstanceOf(ContentValidationException.class);
        }
        verifyNoInteractions(events);
    }

    @Test
    void nothingSavedYetMeansAllDefaults() {
        when(settings.findById(CoupleSettings.SINGLETON_ID)).thenReturn(Optional.empty());
        assertThat(service.get()).isEqualTo(new AppearanceDto(null, null, null, null, null, null, null));
    }
}
