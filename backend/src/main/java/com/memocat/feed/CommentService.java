package com.memocat.feed;

import com.memocat.auth.dto.UserDto;
import com.memocat.domain.Comment;
import com.memocat.domain.Post;
import com.memocat.domain.User;
import com.memocat.feed.dto.CommentDto;
import com.memocat.repository.CommentRepository;
import com.memocat.repository.PostRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ForbiddenException;
import com.memocat.web.PageResponse;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommentService {

    private static final int MAX_TEXT = 1000;
    private static final int MAX_PAGE_SIZE = 100;

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public CommentService(CommentRepository commentRepository,
                          PostRepository postRepository,
                          UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<CommentDto> list(Long postId, int page, int size) {
        requirePost(postId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        return PageResponse.of(
                commentRepository.findByPostIdOrderByCreatedAtAsc(postId, pageable),
                this::toDto);
    }

    @Transactional
    public CommentDto create(String username, Long postId, String text) {
        User author = requireUser(username);
        Post post = requirePost(postId);
        Comment comment = new Comment(post, author, validateText(text));
        return toDto(commentRepository.save(comment));
    }

    @Transactional
    public void delete(String username, Long commentId) {
        User user = requireUser(username);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        if (!comment.getAuthor().getId().equals(user.getId())) {
            throw new ForbiddenException("You can only delete your own comments");
        }
        commentRepository.delete(comment);
    }

    private CommentDto toDto(Comment comment) {
        return new CommentDto(
                comment.getId(),
                UserDto.from(comment.getAuthor()),
                comment.getText(),
                comment.getCreatedAt());
    }

    private String validateText(String text) {
        if (text == null || text.isBlank()) {
            throw new ContentValidationException("Comment text is required");
        }
        if (text.length() > MAX_TEXT) {
            throw new ContentValidationException("Comment too long (max " + MAX_TEXT + ")");
        }
        return text;
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Post requirePost(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
    }

    private int clampSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
