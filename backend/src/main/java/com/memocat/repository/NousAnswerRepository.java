package com.memocat.repository;

import com.memocat.domain.NousAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NousAnswerRepository extends JpaRepository<NousAnswer, Long> {

    List<NousAnswer> findByUserId(Long userId);

    Optional<NousAnswer> findByUserIdAndQuestionId(Long userId, String questionId);
}
