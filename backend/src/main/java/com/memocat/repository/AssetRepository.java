package com.memocat.repository;

import com.memocat.domain.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AssetRepository extends JpaRepository<Asset, Long> {

    /** Total bytes of every stored file (they all live in the database). */
    @Query("select coalesce(sum(a.sizeBytes), 0) from Asset a")
    long totalSizeBytes();
}
