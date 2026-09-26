package com.memocat.repository;

import com.memocat.domain.NavalGame;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NavalGameRepository extends JpaRepository<NavalGame, Long> {

    List<NavalGame> findByStatusIn(Collection<String> statuses);

    Optional<NavalGame> findTopByOrderByIdDesc();

    long countByWinnerId(Long winnerId);
}
