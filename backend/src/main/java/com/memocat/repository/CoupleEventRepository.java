package com.memocat.repository;

import com.memocat.domain.CoupleEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CoupleEventRepository extends JpaRepository<CoupleEvent, Long> {

    List<CoupleEvent> findAllByOrderByDayAscTimeAscIdAsc();

    /** Events that may fall on {@code day}: that very day, or any yearly one. */
    @Query("select e from CoupleEvent e where e.day = :day or e.yearly = true")
    List<CoupleEvent> findCandidatesFor(@Param("day") LocalDate day);

    /** Claims the reminder for this occurrence; 0 when it was already sent. */
    @Modifying
    @Query("update CoupleEvent e set e.remindedFor = :day where e.id = :id "
            + "and (e.remindedFor is null or e.remindedFor <> :day)")
    int markReminded(@Param("id") Long id, @Param("day") LocalDate day);
}
