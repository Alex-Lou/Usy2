package com.memocat.album;

import com.memocat.album.dto.PhotoDto;
import com.memocat.domain.Album;
import com.memocat.domain.Asset;
import com.memocat.domain.Photo;
import com.memocat.domain.User;
import com.memocat.repository.AlbumRepository;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.PhotoRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PhotoServiceTest {

    @Mock private PhotoRepository photoRepository;
    @Mock private AlbumRepository albumRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private UserRepository userRepository;
    @Mock private AlbumMapper albumMapper;

    @InjectMocks private PhotoService photoService;

    private <T> T withId(T entity, long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }

    private void stubAddDependencies(Album album, User user, Asset asset) {
        when(albumRepository.findById(album.getId())).thenReturn(Optional.of(album));
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(user));
        when(assetRepository.findById(asset.getId())).thenReturn(Optional.of(asset));
        when(photoRepository.save(any(Photo.class))).thenAnswer(inv -> inv.getArgument(0));
        when(albumMapper.toDto(any(Photo.class)))
                .thenReturn(new PhotoDto(1L, asset.getId(), null, 0, null, null));
    }

    @Test
    void addAssignsIncrementalPosition() {
        Album album = withId(new Album(null, "A", null), 1L);
        User user = withId(new User("lou", "h", "Lou"), 1L);
        Asset asset = withId(new Asset("k", "f", "image/png", 1, user), 5L);
        Photo last = withId(new Photo(album, asset, user, null, 2), 9L);
        stubAddDependencies(album, user, asset);
        when(photoRepository.findFirstByAlbumIdOrderByPositionDesc(1L)).thenReturn(Optional.of(last));

        photoService.add("lou", 1L, 5L, "hi");

        ArgumentCaptor<Photo> captor = ArgumentCaptor.forClass(Photo.class);
        verify(photoRepository).save(captor.capture());
        assertThat(captor.getValue().getPosition()).isEqualTo(3);
    }

    @Test
    void addFirstPhotoGetsPositionZero() {
        Album album = withId(new Album(null, "A", null), 1L);
        User user = withId(new User("lou", "h", "Lou"), 1L);
        Asset asset = withId(new Asset("k", "f", "image/png", 1, user), 5L);
        stubAddDependencies(album, user, asset);
        when(photoRepository.findFirstByAlbumIdOrderByPositionDesc(1L)).thenReturn(Optional.empty());

        photoService.add("lou", 1L, 5L, null);

        ArgumentCaptor<Photo> captor = ArgumentCaptor.forClass(Photo.class);
        verify(photoRepository).save(captor.capture());
        assertThat(captor.getValue().getPosition()).isZero();
    }

    @Test
    void reorderRejectsMismatchedCount() {
        Album album = withId(new Album(null, "A", null), 1L);
        User user = withId(new User("lou", "h", "Lou"), 1L);
        Asset asset = withId(new Asset("k", "f", "image/png", 1, user), 5L);
        when(albumRepository.findById(1L)).thenReturn(Optional.of(album));
        when(photoRepository.findByAlbumIdOrderByPositionAscIdAsc(1L))
                .thenReturn(List.of(withId(new Photo(album, asset, user, null, 0), 1L),
                        withId(new Photo(album, asset, user, null, 1), 2L)));

        assertThatThrownBy(() -> photoService.reorder(1L, List.of(1L)))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void reorderSetsPositionsByIndex() {
        Album album = withId(new Album(null, "A", null), 1L);
        User user = withId(new User("lou", "h", "Lou"), 1L);
        Asset asset = withId(new Asset("k", "f", "image/png", 1, user), 5L);
        Photo p1 = withId(new Photo(album, asset, user, null, 0), 1L);
        Photo p2 = withId(new Photo(album, asset, user, null, 1), 2L);
        when(albumRepository.findById(1L)).thenReturn(Optional.of(album));
        when(photoRepository.findByAlbumIdOrderByPositionAscIdAsc(1L)).thenReturn(List.of(p1, p2));

        photoService.reorder(1L, List.of(2L, 1L));

        assertThat(p2.getPosition()).isZero();
        assertThat(p1.getPosition()).isEqualTo(1);
        verify(photoRepository).saveAll(anyList());
    }
}
