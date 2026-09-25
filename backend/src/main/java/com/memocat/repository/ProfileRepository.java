package com.memocat.repository;

import com.memocat.domain.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProfileRepository extends JpaRepository<Profile, Long> {

    Optional<Profile> findByUserId(Long userId);

    Optional<Profile> findByUserUsername(String username);

    /**
     * Creates the user's profile unless it exists. Atomic: when two requests
     * race, the unique user_id lets one insert and the other do nothing.
     */
    @Modifying
    @Query(value = "insert into profile (user_id, theme_json, widgets_json) "
            + "values (:userId, cast(:theme as jsonb), cast('[]' as jsonb)) on conflict (user_id) do nothing",
            nativeQuery = true)
    void createIfAbsent(@Param("userId") Long userId, @Param("theme") String themeJson);
}
