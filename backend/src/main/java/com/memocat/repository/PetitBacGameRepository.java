package com.memocat.repository;

import com.memocat.domain.PetitBacGame;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PetitBacGameRepository extends JpaRepository<PetitBacGame, Long> {

    /** The games I play in, most recently played first. */
    @Query("select g from PetitBacGame g join fetch g.owner join fetch g.partner"
            + " where g.owner.id = :userId or g.partner.id = :userId order by g.updatedAt desc")
    List<PetitBacGame> findVisibleTo(Long userId, Pageable page);
}
