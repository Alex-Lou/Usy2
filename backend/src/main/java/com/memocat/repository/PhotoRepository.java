package com.memocat.repository;

import com.memocat.domain.Photo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PhotoRepository extends JpaRepository<Photo, Long> {

    Page<Photo> findByAlbumIdOrderByPositionAscIdAsc(Long albumId, Pageable pageable);

    List<Photo> findByAlbumIdOrderByPositionAscIdAsc(Long albumId);

    Optional<Photo> findFirstByAlbumIdOrderByPositionAscIdAsc(Long albumId);

    Optional<Photo> findFirstByAlbumIdOrderByPositionDesc(Long albumId);

    long countByAlbumId(Long albumId);

    /** Photos added on this month/day of an earlier year, in the given time zone ("il y a 1 an"). */
    @Query(value = """
            select * from photo
            where extract(month from created_at at time zone :zone) = :month
              and extract(day from created_at at time zone :zone) = :day
              and extract(year from created_at at time zone :zone) < :year
            order by created_at desc
            limit 12
            """, nativeQuery = true)
    List<Photo> findOnThisDay(@Param("zone") String zone, @Param("month") int month,
                              @Param("day") int day, @Param("year") int year);

    /** Album photos added during this year (couple's time zone), oldest first: « Notre année ». */
    @Query(value = """
            select * from photo
            where extract(year from created_at at time zone :zone) = :year
            order by created_at, id
            limit :max
            """, nativeQuery = true)
    List<Photo> findInYear(@Param("zone") String zone, @Param("year") int year, @Param("max") int max);

    /** The years that have album photos, most recent first. */
    @Query(value = """
            select distinct cast(extract(year from created_at at time zone :zone) as int) as y from photo
            order by y desc
            """, nativeQuery = true)
    List<Integer> findYears(@Param("zone") String zone);
}
