package com.memocat.repository;

import com.memocat.domain.HiddenNote;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HiddenNoteRepository extends JpaRepository<HiddenNote, Long> {

    @EntityGraph(attributePaths = "author")
    List<HiddenNote> findByAssetIdOrderByIdAsc(Long assetId);

    long countByAuthorIdAndAssetIdAndFoundAtIsNull(Long authorId, Long assetId);
}
