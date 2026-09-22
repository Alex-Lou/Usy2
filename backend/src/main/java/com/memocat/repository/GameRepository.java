package com.memocat.repository;

import com.memocat.domain.Game;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GameRepository extends JpaRepository<Game, Long> {

    Optional<Game> findFirstByTypeAndStatus(String type, String status);

    Optional<Game> findFirstByTypeOrderByUpdatedAtDesc(String type);
}
