package com.memocat.notification;

import com.memocat.domain.Notification;
import com.memocat.domain.User;
import com.memocat.repository.NotificationRepository;
import com.memocat.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository repo;
    @Mock private UserRepository users;
    @Mock private SimpMessagingTemplate messaging;

    private NotificationService service;
    private final User sam = new User("sam", "h", "Sam");

    @BeforeEach
    void setUp() {
        service = new NotificationService(repo, users, messaging);
        ReflectionTestUtils.setField(sam, "id", 2L);
        lenient().when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
        lenient().when(repo.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void theSameNewsStillUnreadIsReplacedNotPiledUp() {
        Notification older = new Notification(2L, "Lou t'a envoyé un message 💬", "coucou", "/chat?m=1", "chat");
        when(repo.findByRecipientIdAndTagAndReadFalse(2L, "chat")).thenReturn(List.of(older));

        var dto = service.record(2L, "Lou t'a envoyé un message 💬", "ça va ?", "/chat?m=2", "chat");

        verify(repo).deleteAll(List.of(older));
        assertThat(dto.excerpt()).isEqualTo("ça va ?");
        assertThat(dto.recipientId()).isEqualTo(2L);
        assertThat(dto.read()).isFalse();
    }

    @Test
    void onlyTheLatestHundredAreKept() {
        when(repo.idsNewestFirst(any(), any(Pageable.class))).thenReturn(List.of(500L));

        service.record(2L, "x", null, "/", "t");

        ArgumentCaptor<Pageable> page = ArgumentCaptor.forClass(Pageable.class);
        verify(repo).idsNewestFirst(any(), page.capture());
        assertThat(page.getValue().getOffset()).isEqualTo(NotificationService.KEEP - 1); // the 100th newest
        verify(repo).deleteOlderThan(2L, 500L);
    }

    @Test
    void nothingIsDroppedBelowAHundred() {
        when(repo.idsNewestFirst(any(), any(Pageable.class))).thenReturn(List.of());

        service.record(2L, "x", null, "/", "t");

        verify(repo, never()).deleteOlderThan(any(), any());
    }

    @Test
    void aNewEntryGoesLiveToItsRecipientOnly() {
        var dto = service.record(2L, "Lou pense à toi 💭", null, "/chat", "thinking");

        service.publish("sam", dto);

        verify(messaging).convertAndSendToUser("sam", "/queue/notifications", dto);
    }

    @Test
    void aVeryLongTextIsCut() {
        var dto = service.record(2L, "a".repeat(400), null, "/", "t");
        assertThat(dto.text()).hasSize(300).endsWith("…");
    }

    @Test
    void someoneElsesEntryIsNeverMarked() {
        Notification lous = new Notification(1L, "x", null, "/", "t");
        when(repo.findById(9L)).thenReturn(Optional.of(lous));

        service.markRead("sam", 9L);

        assertThat(lous.isRead()).isFalse();
    }

    @Test
    void listingReadsOnlyMyOwnEntries() {
        when(repo.findByRecipientIdOrderByIdDesc(any(), any(Pageable.class))).thenReturn(List.of());
        when(repo.countByRecipientIdAndReadFalse(2L)).thenReturn(3L);

        var list = service.list("sam");

        verify(repo).findByRecipientIdOrderByIdDesc(any(), any(Pageable.class));
        verify(repo).countByRecipientIdAndReadFalse(2L);
        assertThat(list.unread()).isEqualTo(3L);
    }
}
