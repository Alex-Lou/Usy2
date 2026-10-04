package com.memocat.repository;

import com.memocat.domain.PetitBacEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface PetitBacEntryRepository extends JpaRepository<PetitBacEntry, Long> {

    List<PetitBacEntry> findByRoundId(Long roundId);

    List<PetitBacEntry> findByRoundIdIn(Collection<Long> roundIds);

    /** Sheets of rounds under way not handed in yet (their clock is running, or has run out). */
    @Query("select e from PetitBacEntry e join fetch e.round r join fetch r.game "
            + "where e.doneAt is null and r.finishedAt is null and (e.startedAt is not null or r.startedAt is not null)")
    List<PetitBacEntry> findOpenStarted();
}
