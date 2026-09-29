package com.memocat.hidden;

import com.memocat.couple.CoupleActivity;
import com.memocat.domain.Album;
import com.memocat.domain.Asset;
import com.memocat.domain.HiddenNote;
import com.memocat.domain.Photo;
import com.memocat.domain.User;
import com.memocat.repository.HiddenNoteRepository;
import com.memocat.repository.PhotoRepository;
import com.memocat.repository.PostRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ForbiddenException;
import com.memocat.web.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HiddenNoteServiceTest {

    @Mock private HiddenNoteRepository notes;
    @Mock private UserRepository users;
    @Mock private PhotoRepository photos;
    @Mock private PostRepository posts;
    @Mock private ApplicationEventPublisher events;

    private HiddenNoteService service;
    private User lou;
    private User sam;

    @BeforeEach
    void setUp() {
        service = new HiddenNoteService(notes, users, photos, posts, events,
                Clock.fixed(Instant.parse("2026-09-29T20:00:00Z"), ZoneOffset.UTC));
        lou = user(1L, "lou", "Lou");
        sam = user(2L, "sam", "Sam");
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
        lenient().when(notes.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private static User user(Long id, String name, String display) {
        User u = new User(name, "hash", display);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private void photoInAlbum(Long assetId, Long albumId) {
        Album album = new Album(lou, "Été", null);
        ReflectionTestUtils.setField(album, "id", albumId);
        Asset asset = new Asset("k", "a.jpg", "image/jpeg", 10, lou);
        ReflectionTestUtils.setField(asset, "id", assetId);
        when(photos.findFirstByAssetId(assetId)).thenReturn(Optional.of(new Photo(album, asset, lou, null, 0)));
    }

    @Test
    void theOtherOneSeesOnlyAPawUntilFound() {
        HiddenNote note = new HiddenNote(lou, 40L, "Je t'aime 🐾", Instant.now());
        when(notes.findByAssetIdOrderByIdAsc(40L)).thenReturn(List.of(note));

        assertThat(service.onPhoto("sam", 40L).get(0).text()).isNull();
        assertThat(service.onPhoto("lou", 40L).get(0).text()).isEqualTo("Je t'aime 🐾");
    }

    @Test
    void findingItRevealsItAndTellsTheAuthorOnce() {
        photoInAlbum(40L, 7L);
        HiddenNote note = new HiddenNote(lou, 40L, "Surprise", Instant.now());
        ReflectionTestUtils.setField(note, "id", 3L);
        when(notes.findById(3L)).thenReturn(Optional.of(note));

        assertThat(service.find("sam", 3L).text()).isEqualTo("Surprise");
        service.find("sam", 3L);

        ArgumentCaptor<CoupleActivity> sent = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events, times(1)).publishEvent(sent.capture());
        assertThat(sent.getValue().kind()).isEqualTo(CoupleActivity.HIDDEN_FOUND);
        assertThat(sent.getValue().detail()).isEqualTo("/albums/7");
    }

    @Test
    void theAuthorCannotFindTheirOwn() {
        when(notes.findById(3L)).thenReturn(Optional.of(new HiddenNote(lou, 40L, "x", Instant.now())));
        assertThatThrownBy(() -> service.find("lou", 3L)).isInstanceOf(ForbiddenException.class);
        verify(events, never()).publishEvent(any());
    }

    @Test
    void onlyBehindAnAlbumOrPostPhoto() {
        when(photos.findFirstByAssetId(99L)).thenReturn(Optional.empty());
        when(posts.findFirstByImageAssetId(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.hide("lou", 99L, "Coucou")).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void oneWaitingNotePerPhotoEach() {
        photoInAlbum(40L, 7L);
        when(notes.countByAuthorIdAndAssetIdAndFoundAtIsNull(1L, 40L)).thenReturn(1L);
        assertThatThrownBy(() -> service.hide("lou", 40L, "Encore")).isInstanceOf(ConflictException.class);
    }

    @Test
    void onlyTheAuthorRemovesIt() {
        HiddenNote note = new HiddenNote(lou, 40L, "x", Instant.now());
        when(notes.findById(3L)).thenReturn(Optional.of(note));
        assertThatThrownBy(() -> service.delete("sam", 3L)).isInstanceOf(ForbiddenException.class);
        service.delete("lou", 3L);
        verify(notes).delete(note);
    }
}
