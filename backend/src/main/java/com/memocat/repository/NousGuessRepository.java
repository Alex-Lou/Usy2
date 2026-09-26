package com.memocat.repository;

import com.memocat.domain.NousGuess;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NousGuessRepository extends JpaRepository<NousGuess, Long> {

    /** What a person guessed (about the other one). */
    List<NousGuess> findByGuesserIdOrderByCreatedAtDesc(Long guesserId);

    /** What was guessed about a person. */
    List<NousGuess> findByAuthorIdOrderByCreatedAtDesc(Long authorId);

    Optional<NousGuess> findByGuesserIdAndQuestionId(Long guesserId, String questionId);

    /** When an answer changes, the guesses about it no longer hold. */
    void deleteByAuthorIdAndQuestionId(Long authorId, String questionId);
}
