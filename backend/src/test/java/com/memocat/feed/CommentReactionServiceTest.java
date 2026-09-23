package com.memocat.feed;

import com.memocat.domain.CommentReaction;
import com.memocat.domain.User;
import com.memocat.repository.CommentReactionRepository;
import com.memocat.repository.CommentRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentReactionServiceTest {

    @Mock private CommentReactionRepository reactions;
    @Mock private CommentRepository messages;
    @Mock private UserRepository users;
    @Mock private org.springframework.context.ApplicationEventPublisher events;
    private CommentReactionService service;

    @BeforeEach
    void setUp() {
        service = new CommentReactionService(reactions, messages, users, events);
        User lou = new User("lou", "h", "Lou");
        ReflectionTestUtils.setField(lou, "id", 1L);
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(messages.existsById(7L)).thenReturn(true);
    }

    @Test
    void firstReactionIsSavedAndBroadcast() {
        when(reactions.findByCommentIdAndUserId(7L, 1L)).thenReturn(Optional.empty());
        when(reactions.findByCommentIdOrderByCreatedAtAsc(7L)).thenReturn(List.of(new CommentReaction(7L, 1L, "😂")));

        com.memocat.feed.dto.CommentReactionsDto change = service.react("lou", 7L, "😂");

        ArgumentCaptor<CommentReaction> saved = ArgumentCaptor.forClass(CommentReaction.class);
        verify(reactions).save(saved.capture());
        assertThat(saved.getValue().getEmoji()).isEqualTo("😂");
        assertThat(change.commentId()).isEqualTo(7L);
        assertThat(change.reactions()).extracting("emoji").containsExactly("😂");
        verify(events).publishEvent(change);
    }

    @Test
    void anotherEmojiReplacesMine() {
        CommentReaction mine = new CommentReaction(7L, 1L, "😂");
        when(reactions.findByCommentIdAndUserId(7L, 1L)).thenReturn(Optional.of(mine));

        service.react("lou", 7L, "❤️");

        assertThat(mine.getEmoji()).isEqualTo("❤️");
        verify(reactions, never()).save(any());
        verify(reactions, never()).delete(any());
    }

    @Test
    void sameEmojiAgainOrNoneRemovesMine() {
        CommentReaction mine = new CommentReaction(7L, 1L, "😂");
        when(reactions.findByCommentIdAndUserId(7L, 1L)).thenReturn(Optional.of(mine));

        service.react("lou", 7L, "😂");
        service.react("lou", 7L, null);

        verify(reactions, org.mockito.Mockito.times(2)).delete(mine);
    }

    @Test
    void unknownEmojiOrMessageIsRefused() {
        assertThatThrownBy(() -> service.react("lou", 7L, "<b>")).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.react("lou", 99L, "😂")).isInstanceOf(ResourceNotFoundException.class);
        verify(events, never()).publishEvent(any());
    }
}
