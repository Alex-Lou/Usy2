package com.memocat.repository;

import com.memocat.domain.SharedList;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SharedListRepository extends JpaRepository<SharedList, Long> {

    List<SharedList> findAllByOrderByCreatedAtAscIdAsc();
}
