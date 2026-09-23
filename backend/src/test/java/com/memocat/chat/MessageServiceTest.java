package com.memocat.chat;

import com.memocat.chat.dto.MessageDto;
import com.memocat.domain.Asset;
import com.memocat.domain.Message;
import com.memocat.domain.User;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.MessageRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class MessageServiceTest {

    @Mock private MessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private ApplicationEventPublisher events;

    @InjectMocks private MessageService messageService;

    @Test
    void sendPersistsValidMessage() {
        User sender = new User("lou", "h", "Lou");
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(sender));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageDto dto = messageService.send("lou", "Coucou 💕", null);

        assertThat(dto.content()).isEqualTo("Coucou 💕");
        assertThat(dto.sender().username()).isEqualTo("lou");
        verify(messageRepository).save(any(Message.class));
        verify(events).publishEvent(new ChatMessageSent(null, "Lou"));
    }

    @Test
    void sendRejectsBlankContent() {
        User sender = new User("lou", "h", "Lou");
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(sender));

        assertThatThrownBy(() -> messageService.send("lou", "   ", null))
                .isInstanceOf(ContentValidationException.class);
        verify(messageRepository, never()).save(any());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void sendRejectsTooLongContent() {
        User sender = new User("lou", "h", "Lou");
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(sender));

        assertThatThrownBy(() -> messageService.send("lou", "x".repeat(2001), null))
                .isInstanceOf(ContentValidationException.class);
        verify(messageRepository, never()).save(any());
    }

    private static User user(long id, String username) {
        User u = new User(username, "h", username);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    @Test
    void aPhotoAloneIsAValidMessage() {
        User lou = user(1, "lou");
        Asset photo = new Asset("k.jpg", "plage.jpg", "image/jpeg", 10, lou);
        ReflectionTestUtils.setField(photo, "id", 7L);
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(assetRepository.findById(7L)).thenReturn(Optional.of(photo));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageDto dto = messageService.send("lou", "  ", 7L);

        assertThat(dto.content()).isEmpty();
        assertThat(dto.attachment().id()).isEqualTo(7L);
        assertThat(dto.attachment().originalFilename()).isEqualTo("plage.jpg");
    }

    @Test
    void onlyYourOwnUploadCanBeAttached() {
        User lou = user(1, "lou");
        Asset samsFile = new Asset("k.pdf", "a.pdf", "application/pdf", 10, user(2, "sam"));
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(assetRepository.findById(9L)).thenReturn(Optional.of(samsFile));
        when(assetRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> messageService.send("lou", "tiens", 9L)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> messageService.send("lou", "tiens", 10L)).isInstanceOf(ContentValidationException.class);
        verify(messageRepository, never()).save(any());
    }
}
