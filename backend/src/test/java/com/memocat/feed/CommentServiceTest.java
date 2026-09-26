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
    private com.memocat.repository.CommentReactionRepository reactionRepository;
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

        commentService.create("alex", 9L, "trop beau 😍", null);

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

        assertThatThrownBy(() -> commentService.create("alex", 9L, "   ", null))
                .isInstanceOf(ContentValidationException.class);
        verify(events, never()).publishEvent(any(Object.class));
    }

    @Test
    void aReplyJoinsTheThreadOfItsCommentAndTagsWhoItNames() {
        User lou = user(1L, "lou");
        User sam = user(2L, "sam");
        ReflectionTestUtils.setField(sam, "displayName", "Sam Martin");
        Post post = new Post(lou, "hi", null);
        ReflectionTestUtils.setField(post, "id", 9L);
        Comment top = new Comment(post, sam, "joli !");
        ReflectionTestUtils.setField(top, "id", 30L);
        Comment reply = new Comment(post, lou, "merci", top);
        ReflectionTestUtils.setField(reply, "id", 31L);
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(userRepository.findAll()).thenReturn(java.util.List.of(lou, sam));
        when(postRepository.findById(9L)).thenReturn(Optional.of(post));
        when(commentRepository.findById(31L)).thenReturn(Optional.of(reply));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        var dto = commentService.create("lou", 9L, "@Sam Martin oui, on y retourne !", 31L);

        assertThat(dto.parentId()).as("a reply to a reply joins the thread").isEqualTo(30L);
        ArgumentCaptor<FeedActivity> event = ArgumentCaptor.forClass(FeedActivity.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().mentionedIds()).containsExactly(2L);
        assertThat(event.getValue().replyToId()).as("the thread's author hears about it").isEqualTo(2L);
    }

    @Test
    void aReplyMustAnswerACommentOfTheSamePost() {
        User lou = user(1L, "lou");
        Post post = new Post(lou, "hi", null);
        ReflectionTestUtils.setField(post, "id", 9L);
        Post other = new Post(lou, "autre", null);
        ReflectionTestUtils.setField(other, "id", 10L);
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(postRepository.findById(9L)).thenReturn(Optional.of(post));
        when(commentRepository.findById(40L)).thenReturn(Optional.of(new Comment(other, lou, "ailleurs")));

        assertThatThrownBy(() -> commentService.create("lou", 9L, "ici", 40L)).isInstanceOf(ContentValidationException.class);
        verify(events, never()).publishEvent(any(Object.class));
    }

    @Test
    void aTagIsTheNameAfterAnAtNotGluedToMoreLetters() {
        User lou = user(1L, "lou");
        User sam = user(2L, "sam");
        ReflectionTestUtils.setField(sam, "displayName", "Sam");
        var people = java.util.List.of(lou, sam);
        assertThat(Mentions.in("coucou @sam !", people, 1L)).containsExactly(2L);
        assertThat(Mentions.in("@Sam", people, 1L)).containsExactly(2L);
        assertThat(Mentions.in("@Samuel", people, 1L)).isEmpty();
        assertThat(Mentions.in("sam sans arobase", people, 1L)).isEmpty();
        assertThat(Mentions.in("moi @lou", people, 1L)).as("never oneself").isEmpty();
    }
}
