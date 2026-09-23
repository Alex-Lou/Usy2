package com.memocat.repository;

import com.memocat.domain.VapidKey;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VapidKeyRepository extends JpaRepository<VapidKey, Short> {
}
