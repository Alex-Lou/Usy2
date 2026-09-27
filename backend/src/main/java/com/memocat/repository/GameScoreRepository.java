package com.memocat.repository;

import com.memocat.domain.GameScore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GameScoreRepository extends JpaRepository<GameScore, Long> {

    Optional<GameScore> findByTypeAndUserId(String type, Long userId);

    List<GameScore> findByType(String type);
}
