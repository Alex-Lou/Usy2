package com.memocat.repository;

import com.memocat.domain.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** The quoted messages come in the same query (no extra query per reply). */
    @EntityGraph(attributePaths = {"replyTo", "replyTo.sender", "replyTo.attachment"})
    Page<Message> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
