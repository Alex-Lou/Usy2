package com.memocat.repository;

import com.memocat.domain.CommentReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CommentReactionRepository extends JpaRepository<CommentReaction, Long> {

    Optional<CommentReaction> findByCommentIdAndUserId(Long commentId, Long userId);

    List<CommentReaction> findByCommentIdOrderByCreatedAtAsc(Long commentId);

    /** All reactions of a page of comments, in one query. */
    List<CommentReaction> findByCommentIdInOrderByCreatedAtAsc(Collection<Long> commentIds);
}
