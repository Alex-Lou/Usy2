package com.memocat.repository;

import com.memocat.domain.NousMark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NousMarkRepository extends JpaRepository<NousMark, Long> {

    Optional<NousMark> findByUserIdAndQuestionIdAndKind(Long userId, String questionId, String kind);
}
