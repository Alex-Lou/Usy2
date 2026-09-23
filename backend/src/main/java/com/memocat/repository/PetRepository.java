package com.memocat.repository;

import com.memocat.domain.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PetRepository extends JpaRepository<Pet, Short> {
}
