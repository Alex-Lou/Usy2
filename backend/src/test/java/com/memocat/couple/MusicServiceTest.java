package com.memocat.couple;

import com.memocat.couple.dto.CoupleRequests.PlaylistRequest;
import com.memocat.couple.dto.CoupleRequests.TrackRequest;
import com.memocat.domain.Playlist;
import com.memocat.domain.PlaylistTrack;
import com.memocat.domain.User;
import com.memocat.repository.PlaylistRepository;
import com.memocat.repository.PlaylistTrackRepository;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MusicServiceTest {

    @Mock private PlaylistRepository playlists;
    @Mock private PlaylistTrackRepository tracks;
    @Mock private UserRepository users;
    @Mock private ApplicationEventPublisher events;

    @InjectMocks
    private MusicService service;

    private final User lou = new User("lou", "hash", "Lou");
    private Playlist roadTrip;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(lou, "id", 1L);
        roadTrip = new Playlist("Road trip", "🚗", lou);
        ReflectionTestUtils.setField(roadTrip, "id", 3L);
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(playlists.findById(3L)).thenReturn(Optional.of(roadTrip));
        lenient().when(tracks.findByPlaylistIdInOrderByPositionAscIdAsc(anyCollection())).thenReturn(List.of());
    }

    private PlaylistTrack track(long id, int position) {
        PlaylistTrack t = new PlaylistTrack(roadTrip, position, lou);
        t.edit("Song " + id, null, null, null);
        ReflectionTestUtils.setField(t, "id", id);
        return t;
    }

    @Test
    void addingATrackGoesAtTheEndAndOnlySyncs() {
        when(tracks.countByPlaylistId(3L)).thenReturn(2L);
        when(tracks.nextPosition(3L)).thenReturn(2);

        service.addTrack("lou", 3L, new TrackRequest("  Bohemian Rhapsody ", " Queen ", " https://youtu.be/fJ9rUzIMcZQ ", ""));

        ArgumentCaptor<PlaylistTrack> saved = ArgumentCaptor.forClass(PlaylistTrack.class);
        verify(tracks).save(saved.capture());
        assertThat(saved.getValue().getTitle()).isEqualTo("Bohemian Rhapsody");
        assertThat(saved.getValue().getArtist()).isEqualTo("Queen");
        assertThat(saved.getValue().getUrl()).isEqualTo("https://youtu.be/fJ9rUzIMcZQ");
        assertThat(saved.getValue().getNote()).isNull();
        assertThat(saved.getValue().getPosition()).isEqualTo(2);
        ArgumentCaptor<CoupleActivity> activity = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events).publishEvent(activity.capture());
        assertThat(activity.getValue().kind()).isEqualTo(CoupleActivity.MUSIC);
        assertThat(activity.getValue().detail()).isNull();
    }

    @Test
    void aTrackCanBeJustAName() {
        when(tracks.nextPosition(3L)).thenReturn(0);

        service.addTrack("lou", 3L, new TrackRequest("La chanson du resto", null, null, "à retrouver"));

        ArgumentCaptor<PlaylistTrack> saved = ArgumentCaptor.forClass(PlaylistTrack.class);
        verify(tracks).save(saved.capture());
        assertThat(saved.getValue().getUrl()).isNull();
    }

    @Test
    void onlyPlainWebLinksAreKept() {
        for (String bad : List.of("javascript:alert(1)", "data:text/html,x", "intent://x#Intent;end",
                "patotube://download?url=x", "https://user:pw@example.com/", "ftp://example.com/a.mp3")) {
            assertThatThrownBy(() -> service.addTrack("lou", 3L, new TrackRequest("Song", null, bad, null)))
                    .as(bad)
                    .isInstanceOf(ContentValidationException.class);
        }
        verify(tracks, never()).save(any());
        verifyNoInteractions(events);
    }

    @Test
    void emptyOrTooLongContentIsRefused() {
        assertThatThrownBy(() -> service.addTrack("lou", 3L, new TrackRequest("  ", null, null, null)))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.addTrack("lou", 3L, new TrackRequest("x".repeat(121), null, null, null)))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.create("lou", new PlaylistRequest(" ", null)))
                .isInstanceOf(ContentValidationException.class);
        when(tracks.countByPlaylistId(3L)).thenReturn((long) MusicService.MAX_TRACKS);
        assertThatThrownBy(() -> service.addTrack("lou", 3L, new TrackRequest("Song", null, null, null)))
                .isInstanceOf(ContentValidationException.class);
        verify(tracks, never()).save(any());
        verify(playlists, never()).save(any());
    }

    @Test
    void reorderNeedsExactlyThePlaylistsTracks() {
        PlaylistTrack a = track(10, 0);
        PlaylistTrack b = track(11, 1);
        PlaylistTrack c = track(12, 2);
        when(tracks.findByPlaylistIdInOrderByPositionAscIdAsc(List.of(3L))).thenReturn(List.of(a, b, c));

        service.reorder("lou", 3L, List.of(12L, 10L, 11L));
        assertThat(List.of(a.getPosition(), b.getPosition(), c.getPosition())).containsExactly(1, 2, 0);

        for (List<Long> stale : List.of(List.of(10L, 11L), List.of(10L, 11L, 99L), List.of(10L, 10L, 11L))) {
            assertThatThrownBy(() -> service.reorder("lou", 3L, stale))
                    .as(stale.toString())
                    .isInstanceOf(ContentValidationException.class);
        }
        assertThatThrownBy(() -> service.reorder("lou", 3L, null)).isInstanceOf(ContentValidationException.class);
    }
}
