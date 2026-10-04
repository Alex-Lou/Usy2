package com.memocat.repository;

import com.memocat.domain.PetitBacEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PetitBacEntryRepository extends JpaRepository<PetitBacEntry, Long> {

    List<PetitBacEntry> findByRoundId(Long roundId);

    List<PetitBacEntry> findByRoundIdIn(Collection<Long> roundIds);
}
