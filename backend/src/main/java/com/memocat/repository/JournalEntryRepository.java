package com.memocat.repository;

import com.memocat.domain.JournalEntry;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long> {

    /** Both lines of each day in [from, to], newest day first (at most two a day: bounded by the range). */
    @EntityGraph(attributePaths = "author")
    List<JournalEntry> findByDayBetweenOrderByDayDescIdAsc(LocalDate from, LocalDate to);

    Optional<JournalEntry> findByAuthorIdAndDay(Long authorId, LocalDate day);

    /** The years that have lines, most recent first. */
    @Query("select distinct year(e.day) from JournalEntry e order by year(e.day) desc")
    List<Integer> findYears();
}
