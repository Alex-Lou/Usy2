package com.memocat.couple;

import com.memocat.couple.dto.CoupleRequests.PlaylistRequest;
import com.memocat.couple.dto.CoupleRequests.TrackRequest;
import com.memocat.couple.dto.PlaylistDto;
import com.memocat.couple.dto.PlaylistDto.TrackDto;
import com.memocat.domain.Playlist;
import com.memocat.domain.PlaylistTrack;
import com.memocat.domain.User;
import com.memocat.profile.WidgetValidator;
import com.memocat.repository.PlaylistRepository;
import com.memocat.repository.PlaylistTrackRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Shared playlists ("Musique"): everything is common, so either person may
 * change anything. A track's link must be a plain http(s) address (never
 * javascript:, data:, intent:…); it is only ever opened, never fetched here.
 * Each change returns the whole playlist so the client simply replaces it.
 */
@Service
public class MusicService {

    static final int MAX_PLAYLISTS = 30;
    static final int MAX_TRACKS = 500;
    static final int MAX_NAME = 40;
    static final int MAX_EMOJI = 16;
    static final int MAX_TITLE = 120;
    static final int MAX_ARTIST = 80;
    static final int MAX_NOTE = 200;

    private final PlaylistRepository playlists;
    private final PlaylistTrackRepository tracks;
    private final UserRepository users;
    private final ApplicationEventPublisher events;

    public MusicService(PlaylistRepository playlists, PlaylistTrackRepository tracks, UserRepository users,
                        ApplicationEventPublisher events) {
        this.playlists = playlists;
        this.tracks = tracks;
        this.users = users;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<PlaylistDto> all() {
        List<Playlist> all = playlists.findAllByOrderByCreatedAtAscIdAsc();
        Map<Long, List<TrackDto>> byPlaylist = all.isEmpty() ? Map.of()
                : tracks.findByPlaylistIdInOrderByPositionAscIdAsc(all.stream().map(Playlist::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(t -> t.getPlaylist().getId(),
                        Collectors.mapping(MusicService::toTrackDto, Collectors.toList())));
        return all.stream().map(p -> toDto(p, byPlaylist.getOrDefault(p.getId(), List.of()))).toList();
    }

    @Transactional
    public PlaylistDto create(String username, PlaylistRequest request) {
        User me = requireUser(username);
        if (playlists.count() >= MAX_PLAYLISTS) {
            throw new ContentValidationException("Trop de playlists (max " + MAX_PLAYLISTS + ")");
        }
        Playlist playlist = playlists.save(new Playlist(name(request), emoji(request), me));
        return changed(me, playlist);
    }

    @Transactional
    public PlaylistDto rename(String username, Long playlistId, PlaylistRequest request) {
        User me = requireUser(username);
        Playlist playlist = requirePlaylist(playlistId);
        playlist.rename(name(request), emoji(request));
        return changed(me, playlist);
    }

    @Transactional
    public void delete(String username, Long playlistId) {
        User me = requireUser(username);
        Playlist playlist = requirePlaylist(playlistId);
        playlists.delete(playlist); // tracks go with it (on delete cascade)
        events.publishEvent(CoupleActivity.of(CoupleActivity.MUSIC, me, null, playlistId));
    }

    @Transactional
    public PlaylistDto addTrack(String username, Long playlistId, TrackRequest request) {
        User me = requireUser(username);
        Playlist playlist = requirePlaylist(playlistId);
        if (tracks.countByPlaylistId(playlistId) >= MAX_TRACKS) {
            throw new ContentValidationException("Playlist pleine (max " + MAX_TRACKS + ")");
        }
        PlaylistTrack track = new PlaylistTrack(playlist, tracks.nextPosition(playlistId), me);
        apply(track, request);
        tracks.save(track);
        return changed(me, playlist);
    }

    @Transactional
    public PlaylistDto updateTrack(String username, Long trackId, TrackRequest request) {
        User me = requireUser(username);
        PlaylistTrack track = requireTrack(trackId);
        apply(track, request);
        return changed(me, track.getPlaylist());
    }

    @Transactional
    public PlaylistDto deleteTrack(String username, Long trackId) {
        User me = requireUser(username);
        PlaylistTrack track = requireTrack(trackId);
        tracks.delete(track);
        return changed(me, track.getPlaylist());
    }

    /** Puts the tracks in the given order; the list must hold exactly the playlist's tracks. */
    @Transactional
    public PlaylistDto reorder(String username, Long playlistId, List<Long> trackIds) {
        User me = requireUser(username);
        Playlist playlist = requirePlaylist(playlistId);
        List<PlaylistTrack> current = tracks.findByPlaylistIdInOrderByPositionAscIdAsc(List.of(playlistId));
        if (trackIds == null || trackIds.size() != current.size() || new HashSet<>(trackIds).size() != trackIds.size()
                || !current.stream().map(PlaylistTrack::getId).collect(Collectors.toSet()).containsAll(trackIds)) {
            throw new ContentValidationException("La playlist a changé entre-temps, recharge-la");
        }
        Map<Long, PlaylistTrack> byId = current.stream().collect(Collectors.toMap(PlaylistTrack::getId, t -> t));
        for (int i = 0; i < trackIds.size(); i++) {
            byId.get(trackIds.get(i)).setPosition(i);
        }
        return changed(me, playlist);
    }

    private void apply(PlaylistTrack track, TrackRequest request) {
        if (request == null) {
            throw new ContentValidationException("Le morceau est vide");
        }
        String url = Texts.optional(request.url(), 2048, "Le lien");
        if (url != null && !WidgetValidator.isWebAddress(url)) {
            throw new ContentValidationException("Le lien doit être une adresse web (http ou https)");
        }
        track.edit(Texts.required(request.title(), MAX_TITLE, "Le titre"),
                Texts.optional(request.artist(), MAX_ARTIST, "L'artiste"),
                url,
                Texts.optional(request.note(), MAX_NOTE, "La note"));
    }

    private static String name(PlaylistRequest request) {
        return Texts.required(request == null ? null : request.name(), MAX_NAME, "Le nom");
    }

    private static String emoji(PlaylistRequest request) {
        return Texts.optional(request == null ? null : request.emoji(), MAX_EMOJI, "L'emoji");
    }

    private PlaylistDto changed(User me, Playlist playlist) {
        events.publishEvent(CoupleActivity.of(CoupleActivity.MUSIC, me, null, playlist.getId()));
        tracks.flush();
        List<TrackDto> list = tracks.findByPlaylistIdInOrderByPositionAscIdAsc(List.of(playlist.getId())).stream()
                .map(MusicService::toTrackDto)
                .toList();
        return toDto(playlist, list);
    }

    private static PlaylistDto toDto(Playlist p, List<TrackDto> list) {
        return new PlaylistDto(p.getId(), p.getName(), p.getEmoji(), p.getCreatedAt(), list);
    }

    private static TrackDto toTrackDto(PlaylistTrack t) {
        return new TrackDto(t.getId(), t.getTitle(), t.getArtist(), t.getUrl(), t.getNote(), t.getAddedBy().getId(),
                t.getCreatedAt());
    }

    private Playlist requirePlaylist(Long id) {
        return playlists.findById(id).orElseThrow(() -> new ResourceNotFoundException("Playlist not found"));
    }

    private PlaylistTrack requireTrack(Long id) {
        return tracks.findById(id).orElseThrow(() -> new ResourceNotFoundException("Track not found"));
    }

    private User requireUser(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
