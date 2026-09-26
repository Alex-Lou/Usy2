package com.memocat.repository;

import com.memocat.domain.QuizSelfAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizSelfAnswerRepository extends JpaRepository<QuizSelfAnswer, Long> {

    List<QuizSelfAnswer> findByUserId(Long userId);

    Optional<QuizSelfAnswer> findByUserIdAndQuestionId(Long userId, String questionId);
}
