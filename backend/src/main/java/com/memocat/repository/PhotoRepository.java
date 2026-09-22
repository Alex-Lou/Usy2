package com.memocat.repository;

import com.memocat.domain.Photo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PhotoRepository extends JpaRepository<Photo, Long> {

    Page<Photo> findByAlbumIdOrderByPositionAscIdAsc(Long albumId, Pageable pageable);

    List<Photo> findByAlbumIdOrderByPositionAscIdAsc(Long albumId);

    Optional<Photo> findFirstByAlbumIdOrderByPositionAscIdAsc(Long albumId);

    Optional<Photo> findFirstByAlbumIdOrderByPositionDesc(Long albumId);

    long countByAlbumId(Long albumId);
}
