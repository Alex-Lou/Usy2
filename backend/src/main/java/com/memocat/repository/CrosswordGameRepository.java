package com.memocat.repository;

import com.memocat.domain.CrosswordGame;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CrosswordGameRepository extends JpaRepository<CrosswordGame, Long> {

    /** My grids and the shared ones, most recently played first. */
    @Query("select g from CrosswordGame g join fetch g.owner where g.shared = true or g.owner.id = :userId order by g.updatedAt desc")
    List<CrosswordGame> findVisibleTo(Long userId, Pageable page);

    Optional<CrosswordGame> findByDailyDate(LocalDate day);

    /** The last grids made (their words are not brought back right away in the next mixed grid). */
    List<CrosswordGame> findTop12ByOrderByCreatedAtDesc();

    /** The days whose grid was finished, since {@code from}, most recent first. */
    @Query("select g.dailyDate from CrosswordGame g where g.dailyDate >= :from and g.finishedAt is not null order by g.dailyDate desc")
    List<LocalDate> findFinishedDays(LocalDate from);

    /** Both players may type at the same time: one write at a time per grid. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from CrosswordGame g where g.id = :id")
    Optional<CrosswordGame> findForUpdate(Long id);
}
