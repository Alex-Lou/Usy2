package com.memocat.repository;

import com.memocat.domain.NousAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NousAnswerRepository extends JpaRepository<NousAnswer, Long> {

    List<NousAnswer> findByUserId(Long userId);

    Optional<NousAnswer> findByUserIdAndQuestionId(Long userId, String questionId);

    /** A reset: a person's answers (to these questions, or all of them). */
    void deleteByUserIdAndQuestionIdIn(Long userId, Collection<String> questionIds);

    void deleteByUserId(Long userId);
}
