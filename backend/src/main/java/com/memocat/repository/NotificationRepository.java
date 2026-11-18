package com.memocat.repository;

import com.memocat.domain.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * The bell: everything but the conversation (its messages and the reactions to them, which
     * the red dot on the Messages tab tells), newest first (ids follow the order of arrival).
     */
    @Query("select n from Notification n where n.recipientId = :recipientId and " + NOT_CONVERSATION + " order by n.id desc")
    List<Notification> bellNewestFirst(Long recipientId, Pageable page);

    @Query("select count(n) from Notification n where n.recipientId = :recipientId and n.read = false and " + NOT_CONVERSATION)
    long countBellUnread(Long recipientId);

    String NOT_CONVERSATION = "(n.tag is null or (n.tag <> 'chat' and n.tag not like 'message-reaction-%'))";

    List<Notification> findByRecipientIdAndTagAndReadFalse(Long recipientId, String tag);

    List<Notification> findByRecipientIdAndTag(Long recipientId, String tag);

    List<Notification> findByRecipientIdAndTagStartingWith(Long recipientId, String prefix);

    /** The conversation's entries (messages, reactions to messages) of one person, read. */
    @Modifying
    @Query("update Notification n set n.read = true where n.recipientId = :recipientId and n.read = false"
            + " and (n.tag = 'chat' or n.tag like 'message-reaction-%')")
    int markConversationRead(Long recipientId);

    @Modifying
    @Query("update Notification n set n.read = true where n.recipientId = :recipientId and n.read = false")
    int markAllRead(Long recipientId);

    @Modifying
    @Query("delete from Notification n where n.recipientId = :recipientId")
    int deleteAllFor(Long recipientId);

    @Modifying
    @Query("delete from Notification n where n.recipientId = :recipientId and n.id < :id")
    int deleteOlderThan(Long recipientId, Long id);

    /** Ids newest first, to find where the kept ones end. */
    @Query("select n.id from Notification n where n.recipientId = :recipientId order by n.id desc")
    List<Long> idsNewestFirst(Long recipientId, Pageable page);
}
