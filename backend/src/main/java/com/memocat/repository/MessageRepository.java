package com.memocat.repository;

import com.memocat.domain.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** The other one's messages up to {@code upToId} are now seen by {@code readerId} (so received too). */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update Message m set m.readAt = :at, "
            + "m.deliveredAt = coalesce(m.deliveredAt, :at) "
            + "where m.sender.id <> :readerId and m.id <= :upToId and m.readAt is null")
    int markReadUpTo(Long readerId, Long upToId, java.time.Instant at);

    /** The other one's messages up to {@code upToId} reached {@code receiverId}'s app or phone. */
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update Message m set m.deliveredAt = :at "
            + "where m.sender.id <> :receiverId and m.id <= :upToId and m.deliveredAt is null")
    int markDeliveredUpTo(Long receiverId, Long upToId, java.time.Instant at);

    /** The quoted messages come in the same query (no extra query per reply). */
    @EntityGraph(attributePaths = {"replyTo", "replyTo.sender", "replyTo.attachment"})
    Page<Message> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
