package com.memocat.repository;

import com.memocat.domain.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** Newest first (ids follow the order of arrival). */
    List<Notification> findByRecipientIdOrderByIdDesc(Long recipientId, Pageable page);

    long countByRecipientIdAndReadFalse(Long recipientId);

    List<Notification> findByRecipientIdAndTagAndReadFalse(Long recipientId, String tag);

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
