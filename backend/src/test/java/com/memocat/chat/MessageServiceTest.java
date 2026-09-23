package com.memocat.chat;

import com.memocat.chat.dto.MessageDto;
import com.memocat.domain.Message;
import com.memocat.domain.User;
import com.memocat.repository.MessageRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock private MessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher events;

    @InjectMocks private MessageService messageService;

    @Test
    void sendPersistsValidMessage() {
        User sender = new User("lou", "h", "Lou");
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(sender));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageDto dto = messageService.send("lou", "Coucou 💕");

        assertThat(dto.content()).isEqualTo("Coucou 💕");
        assertThat(dto.sender().username()).isEqualTo("lou");
        verify(messageRepository).save(any(Message.class));
        verify(events).publishEvent(new ChatMessageSent(null, "Lou"));
    }

    @Test
    void sendRejectsBlankContent() {
        User sender = new User("lou", "h", "Lou");
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(sender));

        assertThatThrownBy(() -> messageService.send("lou", "   "))
                .isInstanceOf(ContentValidationException.class);
        verify(messageRepository, never()).save(any());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void sendRejectsTooLongContent() {
        User sender = new User("lou", "h", "Lou");
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(sender));

        assertThatThrownBy(() -> messageService.send("lou", "x".repeat(2001)))
                .isInstanceOf(ContentValidationException.class);
        verify(messageRepository, never()).save(any());
    }
}
