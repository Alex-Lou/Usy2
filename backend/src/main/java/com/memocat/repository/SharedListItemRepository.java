package com.memocat.repository;

import com.memocat.domain.SharedListItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface SharedListItemRepository extends JpaRepository<SharedListItem, Long> {

    List<SharedListItem> findByListIdInOrderByCreatedAtAscIdAsc(Collection<Long> listIds);

    long countByListId(Long listId);

    @Modifying
    @Query("delete from SharedListItem i where i.list.id = :listId and i.done = true")
    int deleteDoneByListId(@Param("listId") Long listId);
}
