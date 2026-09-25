package com.memocat.repository;

import com.memocat.domain.CoupleSettings;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface CoupleSettingsRepository extends JpaRepository<CoupleSettings, Short> {

    /** The settings row, locked until the end of the transaction (one shared-widgets edit at a time). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from CoupleSettings s where s.id = :id")
    Optional<CoupleSettings> findForUpdate(Short id);
}
