package com.memocat.repository;

import com.memocat.domain.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);

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
}
