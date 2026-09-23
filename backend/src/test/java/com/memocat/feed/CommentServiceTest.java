package com.memocat.feed;

import com.memocat.domain.Comment;
import com.memocat.domain.Post;
import com.memocat.domain.User;
import com.memocat.repository.CommentRepository;
import com.memocat.repository.PostRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;
    @Mock
    private PostRepository postRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ApplicationEventPublisher events;

    @InjectMocks
    private CommentService commentService;

    private User user(long id, String name) {
        User u = new User(name, "hash", name);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    @Test
    void commentPublishesActivityForThePostAuthor() {
        User author = user(1L, "lou");
        User commenter = user(2L, "alex");
        Post post = new Post(author, "hi", null);
        ReflectionTestUtils.setField(post, "id", 9L);
        when(userRepository.findByUsername("alex")).thenReturn(Optional.of(commenter));
        when(postRepository.findById(9L)).thenReturn(Optional.of(post));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        commentService.create("alex", 9L, "trop beau 😍");

        ArgumentCaptor<FeedActivity> event = ArgumentCaptor.forClass(FeedActivity.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().kind()).isEqualTo(FeedActivity.COMMENT);
        assertThat(event.getValue().actorId()).isEqualTo(2L);
        assertThat(event.getValue().postAuthorId()).isEqualTo(1L);
        assertThat(event.getValue().postId()).isEqualTo(9L);
    }

    @Test
    void blankCommentIsRejectedAndNotPublished() {
        User commenter = user(2L, "alex");
        Post post = new Post(user(1L, "lou"), "hi", null);
        when(userRepository.findByUsername("alex")).thenReturn(Optional.of(commenter));
        when(postRepository.findById(9L)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> commentService.create("alex", 9L, "   "))
                .isInstanceOf(ContentValidationException.class);
        verify(events, never()).publishEvent(any(Object.class));
    }
}
