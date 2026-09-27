package com.memocat.repository;

import com.memocat.domain.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    /** Threads in order: each top-level comment, then its replies (a page never shows a reply before its comment). */
    @Query(value = "select c from Comment c left join c.parent p where c.post.id = :postId order by coalesce(p.id, c.id), c.createdAt",
            countQuery = "select count(c) from Comment c where c.post.id = :postId")
    Page<Comment> findThreads(@Param("postId") Long postId, Pageable pageable);

    long countByPostId(Long postId);
}
