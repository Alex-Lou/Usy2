package com.memocat.repository;

import com.memocat.domain.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {

    Optional<MessageReaction> findByMessageIdAndUserId(Long messageId, Long userId);

    List<MessageReaction> findByMessageIdOrderByCreatedAtAsc(Long messageId);

    /** All reactions of a page of messages, in one query. */
    List<MessageReaction> findByMessageIdInOrderByCreatedAtAsc(Collection<Long> messageIds);
}
