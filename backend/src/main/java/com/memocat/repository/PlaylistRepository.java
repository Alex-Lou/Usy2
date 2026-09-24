package com.memocat.repository;

import com.memocat.domain.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlaylistRepository extends JpaRepository<Playlist, Long> {

    List<Playlist> findAllByOrderByCreatedAtAscIdAsc();
}
