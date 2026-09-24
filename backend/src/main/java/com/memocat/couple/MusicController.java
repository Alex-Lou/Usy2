package com.memocat.couple;

import com.memocat.couple.dto.CoupleRequests;
import com.memocat.couple.dto.PlaylistDto;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

/** Shared playlists ("Musique"). Every change returns the whole updated playlist. */
@RestController
@RequestMapping("/api/music")
public class MusicController {

    private final MusicService music;

    public MusicController(MusicService music) {
        this.music = music;
    }

    @GetMapping("/playlists")
    public List<PlaylistDto> all() {
        return music.all();
    }

    @PostMapping("/playlists")
    @ResponseStatus(HttpStatus.CREATED)
    public PlaylistDto create(Principal principal, @RequestBody CoupleRequests.PlaylistRequest request) {
        return music.create(principal.getName(), request);
    }

    @PatchMapping("/playlists/{id}")
    public PlaylistDto rename(Principal principal, @PathVariable Long id,
                              @RequestBody CoupleRequests.PlaylistRequest request) {
        return music.rename(principal.getName(), id, request);
    }

    @DeleteMapping("/playlists/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        music.delete(principal.getName(), id);
    }

    @PostMapping("/playlists/{id}/tracks")
    public PlaylistDto addTrack(Principal principal, @PathVariable Long id,
                                @RequestBody CoupleRequests.TrackRequest request) {
        return music.addTrack(principal.getName(), id, request);
    }

    @PutMapping("/playlists/{id}/order")
    public PlaylistDto reorder(Principal principal, @PathVariable Long id,
                               @RequestBody CoupleRequests.TrackOrderRequest request) {
        return music.reorder(principal.getName(), id, request == null ? null : request.trackIds());
    }

    @PutMapping("/tracks/{id}")
    public PlaylistDto updateTrack(Principal principal, @PathVariable Long id,
                                   @RequestBody CoupleRequests.TrackRequest request) {
        return music.updateTrack(principal.getName(), id, request);
    }

    @DeleteMapping("/tracks/{id}")
    public PlaylistDto deleteTrack(Principal principal, @PathVariable Long id) {
        return music.deleteTrack(principal.getName(), id);
    }
}
