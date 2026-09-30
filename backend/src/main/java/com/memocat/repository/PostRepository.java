package com.memocat.repository;

import com.memocat.domain.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Optional<Post> findFirstByImageAssetId(Long assetId);

    /** Posts written on this month/day of an earlier year, in the given time zone ("il y a 1 an"). */
    @Query(value = """
            select * from post
            where extract(month from created_at at time zone :zone) = :month
              and extract(day from created_at at time zone :zone) = :day
              and extract(year from created_at at time zone :zone) < :year
            order by created_at desc
            limit 10
            """, nativeQuery = true)
    List<Post> findOnThisDay(@Param("zone") String zone, @Param("month") int month,
                             @Param("day") int day, @Param("year") int year);

    /** Posts with a photo written during this year (couple's time zone), oldest first: « Notre année ». */
    @Query(value = """
            select * from post
            where image_asset_id is not null
              and extract(year from created_at at time zone :zone) = :year
            order by created_at, id
            limit :max
            """, nativeQuery = true)
    List<Post> findWithImageInYear(@Param("zone") String zone, @Param("year") int year, @Param("max") int max);

    /** The years that have posts with a photo, most recent first. */
    @Query(value = """
            select distinct cast(extract(year from created_at at time zone :zone) as int) as y from post
            where image_asset_id is not null
            order by y desc
            """, nativeQuery = true)
    List<Integer> findYearsWithImage(@Param("zone") String zone);
}
