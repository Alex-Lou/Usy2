package com.memocat.repository;

import com.memocat.domain.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AssetRepository extends JpaRepository<Asset, Long> {

    /** Total bytes of every stored file (they all live in the database). */
    @Query("select coalesce(sum(a.sizeBytes), 0) from Asset a")
    long totalSizeBytes();

    /** Images stored before their size was recorded. */
    @Query("select a.id from Asset a where a.width is null and a.contentType like 'image/%'")
    List<Long> findImageIdsWithoutDimensions();
}
