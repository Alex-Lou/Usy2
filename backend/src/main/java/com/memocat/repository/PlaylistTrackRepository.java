package com.memocat.repository;

import com.memocat.domain.PlaylistTrack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PlaylistTrackRepository extends JpaRepository<PlaylistTrack, Long> {

    List<PlaylistTrack> findByPlaylistIdInOrderByPositionAscIdAsc(Collection<Long> playlistIds);

    long countByPlaylistId(Long playlistId);

    /** The next free position at the end of a playlist (0 when empty). */
    @Query("select coalesce(max(t.position) + 1, 0) from PlaylistTrack t where t.playlist.id = :playlistId")
    int nextPosition(@Param("playlistId") Long playlistId);
}
