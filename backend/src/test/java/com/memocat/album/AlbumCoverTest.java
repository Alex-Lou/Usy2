package com.memocat.album;

import com.memocat.album.dto.AlbumDto;
import com.memocat.domain.Album;
import com.memocat.domain.Asset;
import com.memocat.domain.Photo;
import com.memocat.domain.User;
import com.memocat.repository.AlbumRepository;
import com.memocat.repository.PhotoRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AlbumCoverTest {

    private final AlbumRepository albums = mock(AlbumRepository.class);
    private final PhotoRepository photos = mock(PhotoRepository.class);
    private final AlbumService service = new AlbumService(albums, mock(UserRepository.class), new AlbumMapper(photos), photos);
    private final User lou = withId(new User("lou", "h", "Lou"), 1L);
    private Album album;
    private Photo first;
    private Photo beach;

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }

    @BeforeEach
    void setUp() {
        album = withId(new Album(lou, "Vacances", null), 3L);
        first = withId(new Photo(album, withId(new Asset("a", "a.png", "image/png", 1, lou), 10L), lou, null, 0), 20L);
        beach = withId(new Photo(album, withId(new Asset("b", "b.png", "image/png", 1, lou), 11L), lou, null, 1), 21L);
        when(albums.findById(3L)).thenReturn(Optional.of(album));
        when(albums.save(any(Album.class))).thenAnswer(inv -> inv.getArgument(0));
        when(photos.findFirstByAlbumIdOrderByPositionAscIdAsc(3L)).thenReturn(Optional.of(first));
    }

    @Test
    void chosenPhotoBecomesTheCoverAndNullGoesBackToTheFirst() {
        when(photos.findById(21L)).thenReturn(Optional.of(beach));

        AlbumDto chosen = service.setCover(3L, 21L);
        assertThat(chosen.coverAssetId()).isEqualTo(11L);

        AlbumDto reset = service.setCover(3L, null);
        assertThat(reset.coverAssetId()).isEqualTo(10L);
    }

    @Test
    void aPhotoFromAnotherAlbumIsRefused() {
        Album other = withId(new Album(lou, "Autre", null), 4L);
        Photo elsewhere = withId(new Photo(other, withId(new Asset("c", "c.png", "image/png", 1, lou), 12L), lou, null, 0), 22L);
        when(photos.findById(22L)).thenReturn(Optional.of(elsewhere));

        assertThatThrownBy(() -> service.setCover(3L, 22L)).isInstanceOf(ContentValidationException.class);
    }
}
