package com.memocat.feed;

import com.memocat.domain.Post;
import com.memocat.domain.Reaction;
import com.memocat.domain.User;
import com.memocat.repository.PostRepository;
import com.memocat.repository.ReactionRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReactionServiceTest {

    @Mock
    private ReactionRepository reactionRepository;
    @Mock
    private PostRepository postRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PostMapper postMapper;

    @InjectMocks
    private ReactionService reactionService;

    private User user(long id) {
        User u = new User("lou", "hash", "Lou");
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    @Test
    void rejectsEmojiOutsideAllowlist() {
        assertThatThrownBy(() -> reactionService.react("lou", 1L, "🍕"))
                .isInstanceOf(ContentValidationException.class);
        verify(reactionRepository, never()).save(any());
    }

    @Test
    void savesReactionWhenAbsent() {
        User u = user(1L);
        Post post = new Post(u, "hi", null);
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(u));
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));
        when(reactionRepository.findByPostIdAndUserIdAndEmoji(eq(1L), eq(1L), eq("❤️")))
                .thenReturn(Optional.empty());

        reactionService.react("lou", 1L, "❤️");

        verify(reactionRepository).save(any(Reaction.class));
    }

    @Test
    void doesNotDuplicateExistingReaction() {
        User u = user(1L);
        Post post = new Post(u, "hi", null);
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(u));
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));
        when(reactionRepository.findByPostIdAndUserIdAndEmoji(anyLong(), anyLong(), any()))
                .thenReturn(Optional.of(new Reaction(post, u, "❤️")));

        reactionService.react("lou", 1L, "❤️");

        verify(reactionRepository, never()).save(any());
    }
}
