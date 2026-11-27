package com.memocat.repository;

import com.memocat.domain.MessageExtraAttachment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface MessageExtraAttachmentRepository extends JpaRepository<MessageExtraAttachment, Long> {

    /** The extra files of a page of messages, with their asset, in one query. */
    @EntityGraph(attributePaths = "asset")
    List<MessageExtraAttachment> findByMessageIdInOrderByMessageIdAscPositionAsc(Collection<Long> messageIds);
}
