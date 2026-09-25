package com.memocat.feed;

import com.memocat.domain.Post;
import com.memocat.domain.Reaction;
import com.memocat.domain.User;
import com.memocat.feed.dto.PostDto;
import com.memocat.repository.PostRepository;
import com.memocat.repository.ReactionRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReactionService {

    private final ReactionRepository reactionRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostMapper postMapper;
    private final ApplicationEventPublisher events;

    public ReactionService(ReactionRepository reactionRepository,
                           PostRepository postRepository,
                           UserRepository userRepository,
                           PostMapper postMapper,
                           ApplicationEventPublisher events) {
        this.reactionRepository = reactionRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.postMapper = postMapper;
        this.events = events;
    }

    @Transactional
    public PostDto react(String username, Long postId, String emoji) {
        if (emoji == null || !ReactionEmojis.ALLOWED.contains(emoji)) {
            throw new ContentValidationException("Unsupported reaction");
        }
        User user = requireUser(username);
        Post post = requirePost(postId);

        // Idempotent: one reaction per (post, user, emoji).
        if (reactionRepository.findByPostIdAndUserIdAndEmoji(postId, user.getId(), emoji).isEmpty()) {
            reactionRepository.save(new Reaction(post, user, emoji));
            events.publishEvent(FeedActivity.reaction(user, post, emoji));
        }
        return postMapper.toDto(post, user.getId());
    }

    @Transactional
    public PostDto unreact(String username, Long postId, String emoji) {
        User user = requireUser(username);
        Post post = requirePost(postId);
        reactionRepository.findByPostIdAndUserIdAndEmoji(postId, user.getId(), emoji)
                .ifPresent(reactionRepository::delete);
        return postMapper.toDto(post, user.getId());
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Post requirePost(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
    }
}
