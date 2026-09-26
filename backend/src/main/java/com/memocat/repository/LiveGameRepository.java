package com.memocat.repository;

import com.memocat.domain.LiveGame;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface LiveGameRepository extends JpaRepository<LiveGame, Long> {

    /** The games still going (a two-person app: a handful at most). */
    List<LiveGame> findByStatusIn(Collection<String> statuses);

    /** The last games, finished or not, newest first. */
    List<LiveGame> findTop10ByOrderByIdDesc();
}
