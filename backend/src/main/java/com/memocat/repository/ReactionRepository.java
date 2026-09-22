package com.memocat.repository;

import com.memocat.domain.Reaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReactionRepository extends JpaRepository<Reaction, Long> {

    List<Reaction> findByPostIdIn(Collection<Long> postIds);

    Optional<Reaction> findByPostIdAndUserIdAndEmoji(Long postId, Long userId, String emoji);
}
