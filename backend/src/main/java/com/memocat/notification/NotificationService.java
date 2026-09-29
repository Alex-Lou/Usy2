package com.memocat.notification;

import com.memocat.domain.Notification;
import com.memocat.domain.User;
import com.memocat.notification.dto.NotificationDto;
import com.memocat.notification.dto.NotificationsDto;
import com.memocat.repository.NotificationRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Everyone's bell, kept on the server so it is the same on every device and
 * also holds what arrived while the app was closed. Written by PushNotifier,
 * which decides what is worth telling; each new entry also goes out live on
 * /topic/notifications. The same news still unread (same tag, e.g. several
 * messages in a row) replaces the previous entry instead of piling up.
 */
@Service
public class NotificationService {

    static final String TOPIC = "/topic/notifications";
    /** Entries kept per person (older ones are dropped). */
    static final int KEEP = 100;
    /** Entries sent to the app at once. */
    static final int PAGE = 30;
    private static final int MAX_TEXT = 300;

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final SimpMessagingTemplate messaging;

    public NotificationService(NotificationRepository notifications, UserRepository users, SimpMessagingTemplate messaging) {
        this.notifications = notifications;
        this.users = users;
        this.messaging = messaging;
    }

    @Transactional
    public NotificationDto record(Long recipientId, String text, String excerpt, String url, String tag) {
        notifications.deleteAll(notifications.findByRecipientIdAndTagAndReadFalse(recipientId, tag));
        Notification saved = notifications.save(new Notification(recipientId, cut(text), cut(excerpt), url, tag));
        List<Long> kept = notifications.idsNewestFirst(recipientId, PageRequest.of(KEEP - 1, 1));
        if (!kept.isEmpty()) {
            notifications.deleteOlderThan(recipientId, kept.get(0));
        }
        return NotificationDto.from(saved);
    }

    /** Sends a recorded entry live (call once its transaction has committed). */
    public void publish(NotificationDto dto) {
        messaging.convertAndSend(TOPIC, dto);
    }

    @Transactional(readOnly = true)
    public NotificationsDto list(String username) {
        Long me = requireUser(username).getId();
        List<NotificationDto> items = notifications.findByRecipientIdOrderByIdDesc(me, PageRequest.of(0, PAGE)).stream()
                .map(NotificationDto::from)
                .toList();
        return new NotificationsDto(items, notifications.countByRecipientIdAndReadFalse(me));
    }

    @Transactional
    public void markAllRead(String username) {
        notifications.markAllRead(requireUser(username).getId());
    }

    /** One entry, e.g. the page it points to is already on screen. Someone else's entry is left alone. */
    @Transactional
    public void markRead(String username, Long id) {
        Long me = requireUser(username).getId();
        notifications.findById(id).filter(n -> n.getRecipientId().equals(me)).ifPresent(Notification::markRead);
    }

    @Transactional
    public void clear(String username) {
        notifications.deleteAllFor(requireUser(username).getId());
    }

    private static String cut(String s) {
        return s == null || s.length() <= MAX_TEXT ? s : s.substring(0, MAX_TEXT - 1) + "…";
    }

    private User requireUser(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
