package com.memocat.chat;

import com.memocat.chat.dto.ChatDeliveredDto;
import com.memocat.domain.User;
import com.memocat.repository.MessageRepository;
import com.memocat.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatReceiptsTest {

    private final MessageRepository messages = mock(MessageRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    private final Instant now = Instant.parse("2026-09-29T16:00:00Z");
    private final ChatReceipts receipts = new ChatReceipts(messages, users, messaging, Clock.fixed(now, ZoneOffset.UTC));

    @Test
    void receivedGoesOutLiveOnlyWhenSomethingChanged() {
        when(messages.markDeliveredUpTo(2L, 40L, now)).thenReturn(1);
        receipts.delivered(2L, 40L);
        verify(messaging).convertAndSend(ChatReceipts.TOPIC, new ChatDeliveredDto(2L, 40L, now));

        when(messages.markDeliveredUpTo(2L, 41L, now)).thenReturn(0);
        receipts.delivered(2L, 41L);
        verify(messaging, never()).convertAndSend(eq(ChatReceipts.TOPIC), eq(new ChatDeliveredDto(2L, 41L, now)));
    }

    @Test
    void openingTheAppReceivesEverythingWaiting() {
        User sam = new User("sam", "h", "Sam");
        ReflectionTestUtils.setField(sam, "id", 2L);
        when(users.findByUsername("sam")).thenReturn(Optional.of(sam));

        receipts.deliveredAllTo("sam");

        verify(messages).markDeliveredUpTo(eq(2L), eq(Long.MAX_VALUE), any());
    }
}
