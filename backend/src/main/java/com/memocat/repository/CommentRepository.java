package com.memocat.repository;

import com.memocat.domain.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    Page<Comment> findByPostIdOrderByCreatedAtAsc(Long postId, Pageable pageable);

    long countByPostId(Long postId);
}
