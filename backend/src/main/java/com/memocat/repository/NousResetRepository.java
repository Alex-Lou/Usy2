package com.memocat.repository;

import com.memocat.domain.NousReset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NousResetRepository extends JpaRepository<NousReset, Long> {

    /** The proposal waiting for an answer (there is only ever one). */
    Optional<NousReset> findFirstByOrderByCreatedAtDesc();
}
