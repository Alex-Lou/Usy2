package com.memocat.repository;

import com.memocat.domain.QuizChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuizChallengeRepository extends JpaRepository<QuizChallenge, Long> {

    /** The latest challenges a person sent or received. */
    List<QuizChallenge> findTop30ByFromUserIdOrToUserIdOrderByCreatedAtDesc(Long fromUserId, Long toUserId);

    /** Sent and not yet played to the end: bounded, so nobody gets flooded. */
    long countByFromUserIdAndFinishedAtIsNull(Long fromUserId);

    /** Every finished duel of a person, just the scores (for the win tally). */
    @Query("select c.fromUser.id, c.fromScore, c.toScore from QuizChallenge c "
            + "where c.finishedAt is not null and (c.fromUser.id = :me or c.toUser.id = :me)")
    List<Object[]> finishedScores(@Param("me") Long me);
}
