package com.memocat.chat;

import com.memocat.domain.MessageReaction;
import com.memocat.domain.User;
import com.memocat.repository.MessageReactionRepository;
import com.memocat.repository.MessageRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
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
class MessageReactionServiceTest {

    @Mock private MessageReactionRepository reactions;
    @Mock private MessageRepository messages;
    @Mock private UserRepository users;
    @Mock private ApplicationEventPublisher events;
    private MessageReactionService service;

    @BeforeEach
    void setUp() {
        service = new MessageReactionService(reactions, messages, users, events);
        User lou = new User("lou", "h", "Lou");
        ReflectionTestUtils.setField(lou, "id", 1L);
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(messages.existsById(7L)).thenReturn(true);
    }

    @Test
    void firstReactionIsSavedAndBroadcast() {
        when(reactions.findByMessageIdAndUserId(7L, 1L)).thenReturn(Optional.empty());
        when(reactions.findByMessageIdOrderByCreatedAtAsc(7L)).thenReturn(List.of(new MessageReaction(7L, 1L, "😂")));

        MessageReactionsChanged change = service.react("lou", 7L, "😂");

        ArgumentCaptor<MessageReaction> saved = ArgumentCaptor.forClass(MessageReaction.class);
        verify(reactions).save(saved.capture());
        assertThat(saved.getValue().getEmoji()).isEqualTo("😂");
        assertThat(change.messageId()).isEqualTo(7L);
        assertThat(change.reactions()).extracting("emoji").containsExactly("😂");
        verify(events).publishEvent(change);
    }

    @Test
    void anotherEmojiReplacesMine() {
        MessageReaction mine = new MessageReaction(7L, 1L, "😂");
        when(reactions.findByMessageIdAndUserId(7L, 1L)).thenReturn(Optional.of(mine));

        service.react("lou", 7L, "❤️");

        assertThat(mine.getEmoji()).isEqualTo("❤️");
        verify(reactions, never()).save(any());
        verify(reactions, never()).delete(any());
    }

    @Test
    void sameEmojiAgainOrNoneRemovesMine() {
        MessageReaction mine = new MessageReaction(7L, 1L, "😂");
        when(reactions.findByMessageIdAndUserId(7L, 1L)).thenReturn(Optional.of(mine));

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
