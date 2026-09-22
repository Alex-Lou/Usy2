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
import com.memocat.web.PageResponse;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PhotoService {

    private static final int MAX_CAPTION = 500;
    private static final int MAX_PAGE_SIZE = 100;

    private final PhotoRepository photoRepository;
    private final AlbumRepository albumRepository;
    private final AssetRepository assetRepository;
    private final UserRepository userRepository;
    private final AlbumMapper albumMapper;

    public PhotoService(PhotoRepository photoRepository,
                        AlbumRepository albumRepository,
                        AssetRepository assetRepository,
                        UserRepository userRepository,
                        AlbumMapper albumMapper) {
        this.photoRepository = photoRepository;
        this.albumRepository = albumRepository;
        this.assetRepository = assetRepository;
        this.userRepository = userRepository;
        this.albumMapper = albumMapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<PhotoDto> list(Long albumId, int page, int size) {
        requireAlbum(albumId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        return PageResponse.of(
                photoRepository.findByAlbumIdOrderByPositionAscIdAsc(albumId, pageable),
                albumMapper::toDto);
    }

    @Transactional
    public PhotoDto add(String username, Long albumId, Long assetId, String caption) {
        Album album = requireAlbum(albumId);
        User uploader = requireUser(username);
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ContentValidationException("Unknown asset"));

        int nextPosition = photoRepository.findFirstByAlbumIdOrderByPositionDesc(albumId)
                .map(p -> p.getPosition() + 1)
                .orElse(0);
        Photo photo = new Photo(album, asset, uploader, validateCaption(caption), nextPosition);
        return albumMapper.toDto(photoRepository.save(photo));
    }

    @Transactional
    public PhotoDto updateCaption(Long albumId, Long photoId, String caption) {
        Photo photo = requirePhotoInAlbum(albumId, photoId);
        photo.setCaption(validateCaption(caption));
        return albumMapper.toDto(photoRepository.save(photo));
    }

    @Transactional
    public void delete(Long albumId, Long photoId) {
        photoRepository.delete(requirePhotoInAlbum(albumId, photoId));
    }

    @Transactional
    public void reorder(Long albumId, List<Long> orderedPhotoIds) {
        requireAlbum(albumId);
        List<Photo> photos = photoRepository.findByAlbumIdOrderByPositionAscIdAsc(albumId);
        if (orderedPhotoIds.size() != photos.size()) {
            throw new ContentValidationException("Reorder must list every photo of the album exactly once");
        }
        for (Photo p : photos) {
            int index = orderedPhotoIds.indexOf(p.getId());
            if (index < 0) {
                throw new ContentValidationException("Reorder list does not match the album's photos");
            }
            p.setPosition(index);
        }
        photoRepository.saveAll(photos);
    }

    private String validateCaption(String caption) {
        if (caption != null && caption.length() > MAX_CAPTION) {
            throw new ContentValidationException("Caption too long (max " + MAX_CAPTION + ")");
        }
        return caption;
    }

    private Photo requirePhotoInAlbum(Long albumId, Long photoId) {
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
        if (!photo.getAlbum().getId().equals(albumId)) {
            throw new ResourceNotFoundException("Photo not found in this album");
        }
        return photo;
    }

    private Album requireAlbum(Long albumId) {
        return albumRepository.findById(albumId)
                .orElseThrow(() -> new ResourceNotFoundException("Album not found"));
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private int clampSize(int size) {
        if (size <= 0) {
            return 30;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
