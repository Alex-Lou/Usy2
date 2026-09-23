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
    @Mock private com.memocat.repository.MessageReactionRepository reactionRepository;
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

    @Test
    void historyCarriesEachMessageReactions() {
        User lou = new User("lou", "h", "Lou");
        org.springframework.test.util.ReflectionTestUtils.setField(lou, "id", 1L);
        Message a = new Message(lou, "coucou", null);
        Message b = new Message(lou, "ça va ?", null);
        org.springframework.test.util.ReflectionTestUtils.setField(a, "id", 10L);
        org.springframework.test.util.ReflectionTestUtils.setField(b, "id", 11L);
        when(messageRepository.findAllByOrderByCreatedAtDesc(any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of(b, a)));
        when(reactionRepository.findByMessageIdInOrderByCreatedAtAsc(java.util.List.of(11L, 10L)))
                .thenReturn(java.util.List.of(new com.memocat.domain.MessageReaction(10L, 2L, "❤️")));

        var page = messageService.history(0, 30);

        assertThat(page.content()).hasSize(2);
        assertThat(page.content().get(0).reactions()).isEmpty();
        assertThat(page.content().get(1).reactions()).extracting("emoji").containsExactly("❤️");
    }

    @Test
    void replyQuotesTheEarlierMessage() {
        User lou = new User("lou", "h", "Lou");
        org.springframework.test.util.ReflectionTestUtils.setField(lou, "id", 1L);
        Message earlier = new Message(lou, "On se voit à 20h ?", null);
        org.springframework.test.util.ReflectionTestUtils.setField(earlier, "id", 5L);
        when(userRepository.findByUsername("lou")).thenReturn(java.util.Optional.of(lou));
        when(messageRepository.findById(5L)).thenReturn(java.util.Optional.of(earlier));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        var dto = messageService.send("lou", "Oui !", null, 5L);

        assertThat(dto.replyTo().id()).isEqualTo(5L);
        assertThat(dto.replyTo().senderName()).isEqualTo("Lou");
        assertThat(dto.replyTo().excerpt()).isEqualTo("On se voit à 20h ?");
        assertThat(dto.replyTo().attachment()).isNull();
    }

    @Test
    void replyToAMissingMessageIsRefused() {
        User lou = new User("lou", "h", "Lou");
        when(userRepository.findByUsername("lou")).thenReturn(java.util.Optional.of(lou));
        when(messageRepository.findById(99L)).thenReturn(java.util.Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> messageService.send("lou", "Oui", null, 99L))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void longQuotesAreShortened() {
        User lou = new User("lou", "h", "Lou");
        Message m = new Message(lou, "x".repeat(500), null);
        assertThat(com.memocat.chat.dto.ReplyPreviewDto.from(m).excerpt()).hasSize(140).endsWith("…");
    }

    @Test
    void quotedVoiceMessageSaysSo() {
        User lou = new User("lou", "h", "Lou");
        com.memocat.domain.Asset voice = new com.memocat.domain.Asset("k.webm", "vocal.webm", "audio/webm", 10, lou);
        assertThat(com.memocat.chat.dto.ReplyPreviewDto.from(new Message(lou, "", voice)).attachment()).isEqualTo("audio");
    }
}
