package com.memocat.album;

import com.memocat.album.dto.AlbumDto;
import com.memocat.album.dto.AlbumRequests;
import com.memocat.album.dto.PhotoDto;
import com.memocat.web.PageResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/albums")
public class AlbumController {

    private final AlbumService albumService;
    private final PhotoService photoService;

    public AlbumController(AlbumService albumService, PhotoService photoService) {
        this.albumService = albumService;
        this.photoService = photoService;
    }

    @GetMapping
    public PageResponse<AlbumDto> list(@RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "12") int size) {
        return albumService.list(page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AlbumDto create(Principal principal, @RequestBody AlbumRequests.CreateAlbum request) {
        return albumService.create(principal.getName(), request.title(), request.description());
    }

    @GetMapping("/{id}")
    public AlbumDto get(@PathVariable Long id) {
        return albumService.get(id);
    }

    @PutMapping("/{id}")
    public AlbumDto update(@PathVariable Long id, @RequestBody AlbumRequests.UpdateAlbum request) {
        return albumService.update(id, request.title(), request.description());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        albumService.delete(id);
    }

    @GetMapping("/{id}/photos")
    public PageResponse<PhotoDto> photos(@PathVariable Long id,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "30") int size) {
        return photoService.list(id, page, size);
    }

    @PostMapping("/{id}/photos")
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoDto addPhoto(Principal principal, @PathVariable Long id,
                             @Valid @RequestBody AlbumRequests.AddPhoto request) {
        return photoService.add(principal.getName(), id, request.assetId(), request.caption());
    }

    @PutMapping("/{id}/photos/order")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorder(@PathVariable Long id, @Valid @RequestBody AlbumRequests.ReorderPhotos request) {
        photoService.reorder(id, request.photoIds());
    }

    @PutMapping("/{id}/photos/{photoId}")
    public PhotoDto updatePhoto(@PathVariable Long id, @PathVariable Long photoId,
                                @RequestBody AlbumRequests.UpdatePhoto request) {
        return photoService.updateCaption(id, photoId, request.caption());
    }

    @DeleteMapping("/{id}/photos/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePhoto(@PathVariable Long id, @PathVariable Long photoId) {
        photoService.delete(id, photoId);
    }
}
