package com.memocat.repository;

import com.memocat.domain.PetItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PetItemRepository extends JpaRepository<PetItem, String> {
}
