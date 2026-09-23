package com.memocat.album;

import com.memocat.album.dto.AlbumDto;
import com.memocat.domain.Album;
import com.memocat.domain.Photo;
import com.memocat.domain.User;
import com.memocat.repository.AlbumRepository;
import com.memocat.repository.PhotoRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.PageResponse;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AlbumService {

    private static final int MAX_TITLE = 150;
    private static final int MAX_DESCRIPTION = 2000;
    private static final int MAX_PAGE_SIZE = 50;

    private final AlbumRepository albumRepository;
    private final UserRepository userRepository;
    private final AlbumMapper albumMapper;
    private final PhotoRepository photoRepository;

    public AlbumService(AlbumRepository albumRepository,
                        UserRepository userRepository,
                        AlbumMapper albumMapper,
                        PhotoRepository photoRepository) {
        this.albumRepository = albumRepository;
        this.userRepository = userRepository;
        this.albumMapper = albumMapper;
        this.photoRepository = photoRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<AlbumDto> list(int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        return PageResponse.of(albumRepository.findAllByOrderByCreatedAtDesc(pageable), albumMapper::toDto);
    }

    @Transactional(readOnly = true)
    public AlbumDto get(Long albumId) {
        return albumMapper.toDto(requireAlbum(albumId));
    }

    @Transactional
    public AlbumDto create(String username, String title, String description) {
        User creator = requireUser(username);
        Album album = new Album(creator, validateTitle(title), validateDescription(description));
        return albumMapper.toDto(albumRepository.save(album));
    }

    @Transactional
    public AlbumDto update(Long albumId, String title, String description) {
        Album album = requireAlbum(albumId);
        album.setTitle(validateTitle(title));
        album.setDescription(validateDescription(description));
        return albumMapper.toDto(albumRepository.save(album));
    }

    /** Picks the album's cover among its photos; null goes back to the first photo. */
    @Transactional
    public AlbumDto setCover(Long albumId, Long photoId) {
        Album album = requireAlbum(albumId);
        Photo cover = null;
        if (photoId != null) {
            cover = photoRepository.findById(photoId)
                    .filter(p -> p.getAlbum().getId().equals(albumId))
                    .orElseThrow(() -> new ContentValidationException("Cette photo n'est pas dans l'album"));
        }
        album.setCoverPhoto(cover);
        return albumMapper.toDto(albumRepository.save(album));
    }

    @Transactional
    public void delete(Long albumId) {
        albumRepository.delete(requireAlbum(albumId));
    }

    private String validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new ContentValidationException("Album title is required");
        }
        if (title.length() > MAX_TITLE) {
            throw new ContentValidationException("Title too long (max " + MAX_TITLE + ")");
        }
        return title;
    }

    private String validateDescription(String description) {
        if (description != null && description.length() > MAX_DESCRIPTION) {
            throw new ContentValidationException("Description too long (max " + MAX_DESCRIPTION + ")");
        }
        return description;
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Album requireAlbum(Long albumId) {
        return albumRepository.findById(albumId)
                .orElseThrow(() -> new ResourceNotFoundException("Album not found"));
    }

    private int clampSize(int size) {
        if (size <= 0) {
            return 12;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
