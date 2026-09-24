package com.memocat.album;

import com.memocat.album.dto.AlbumDto;
import com.memocat.album.dto.PhotoDto;
import com.memocat.auth.dto.UserDto;
import com.memocat.domain.Album;
import com.memocat.domain.Photo;
import com.memocat.repository.PhotoRepository;
import org.springframework.stereotype.Component;

@Component
public class AlbumMapper {

    private final PhotoRepository photoRepository;

    public AlbumMapper(PhotoRepository photoRepository) {
        this.photoRepository = photoRepository;
    }

    public AlbumDto toDto(Album album) {
        long count = photoRepository.countByAlbumId(album.getId());
        Long coverAssetId = album.getCoverPhoto() != null
                ? album.getCoverPhoto().getAsset().getId()
                : photoRepository.findFirstByAlbumIdOrderByPositionAscIdAsc(album.getId())
                        .map(p -> p.getAsset().getId())
                        .orElse(null);
        return new AlbumDto(
                album.getId(),
                album.getTitle(),
                album.getDescription(),
                UserDto.from(album.getCreator()),
                album.getCreatedAt(),
                count,
                coverAssetId,
                album.getCoverPhoto() != null ? album.getCoverFraming() : null);
    }

    public PhotoDto toDto(Photo photo) {
        return new PhotoDto(
                photo.getId(),
                photo.getAsset().getId(),
                photo.getCaption(),
                photo.getPosition(),
                UserDto.from(photo.getUploader()),
                photo.getCreatedAt());
    }
}
