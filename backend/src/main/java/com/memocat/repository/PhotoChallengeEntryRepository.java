package com.memocat.repository;

import com.memocat.domain.PhotoChallengeEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface PhotoChallengeEntryRepository extends JpaRepository<PhotoChallengeEntry, Long> {

    @EntityGraph(attributePaths = {"author", "asset"})
    List<PhotoChallengeEntry> findByWeekStartOrderByIdAsc(LocalDate weekStart);

    @EntityGraph(attributePaths = {"author", "asset"})
    List<PhotoChallengeEntry> findByWeekStartInOrderByWeekStartDescIdAsc(Collection<LocalDate> weeks);

    /** The past weeks that have photos, most recent first. */
    @Query("select distinct e.weekStart from PhotoChallengeEntry e where e.weekStart < :before order by e.weekStart desc")
    Page<LocalDate> findWeeksBefore(LocalDate before, Pageable pageable);
}
