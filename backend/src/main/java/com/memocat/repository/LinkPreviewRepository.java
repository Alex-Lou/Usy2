package com.memocat.repository;

import com.memocat.domain.LinkPreview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface LinkPreviewRepository extends JpaRepository<LinkPreview, String> {

    /** Keeps only the {@code keep} most recently fetched previews. */
    @Modifying
    @Transactional
    @Query(value = "delete from link_preview where url in "
            + "(select url from link_preview order by fetched_at desc offset :keep)", nativeQuery = true)
    int trimTo(@Param("keep") int keep);
}
