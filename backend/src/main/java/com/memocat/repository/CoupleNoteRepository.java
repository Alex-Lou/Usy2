package com.memocat.repository;

import com.memocat.domain.CoupleNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CoupleNoteRepository extends JpaRepository<CoupleNote, Long> {

    Page<CoupleNote> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

    Optional<CoupleNote> findFirstByAuthorIdOrderByCreatedAtDescIdDesc(Long authorId);
}
