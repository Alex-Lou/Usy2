package com.memocat.repository;

import com.memocat.domain.Album;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlbumRepository extends JpaRepository<Album, Long> {

    Page<Album> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
