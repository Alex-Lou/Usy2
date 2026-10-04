package com.memocat.repository;

import com.memocat.domain.PetitBacRound;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PetitBacRoundRepository extends JpaRepository<PetitBacRound, Long> {

    List<PetitBacRound> findByGameIdOrderByNumber(Long gameId);

    List<PetitBacRound> findByGameIdIn(Collection<Long> gameIds);

    /** Both players act on a round at the same time (ready, « Stop ! », checking): one at a time. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from PetitBacRound r where r.game.id = :gameId and r.number = :number")
    Optional<PetitBacRound> findForUpdate(Long gameId, int number);
}
