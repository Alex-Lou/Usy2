package com.memocat.repository;

import com.memocat.domain.QuizProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizProgressRepository extends JpaRepository<QuizProgress, Long> {

    List<QuizProgress> findByUserId(Long userId);

    Optional<QuizProgress> findByUserIdAndLevelKey(Long userId, String levelKey);
}
