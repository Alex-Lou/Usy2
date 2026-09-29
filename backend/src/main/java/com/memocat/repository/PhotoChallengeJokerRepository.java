package com.memocat.repository;

import com.memocat.domain.PhotoChallengeJoker;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface PhotoChallengeJokerRepository extends JpaRepository<PhotoChallengeJoker, PhotoChallengeJoker.Key> {

    List<PhotoChallengeJoker> findByIdWeekStartInOrderByCreatedAtAsc(Collection<LocalDate> weeks);
}
