package com.memocat.chat;

import com.memocat.chat.dto.ChatDeliveredDto;
import com.memocat.repository.MessageRepository;
import com.memocat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

/**
 * The ✓✓ "reçu" of the chat: a message reached the other one when their app
 * is connected as it arrives, when their phone accepted its push notification,
 * or at the latest when they open the app. Each change goes out live on
 * /topic/chat-delivered (only when something changed).
 */
@Component
public class ChatReceipts {

    static final String TOPIC = "/topic/chat-delivered";

    private final MessageRepository messages;
    private final UserRepository users;
    private final SimpMessagingTemplate messaging;
    private final Clock clock;

    @Autowired
    public ChatReceipts(MessageRepository messages, UserRepository users, SimpMessagingTemplate messaging) {
        this(messages, users, messaging, Clock.systemUTC());
    }

    ChatReceipts(MessageRepository messages, UserRepository users, SimpMessagingTemplate messaging, Clock clock) {
        this.messages = messages;
        this.users = users;
        this.messaging = messaging;
        this.clock = clock;
    }

    /** The other one's messages up to {@code upToId} reached {@code receiverId}. */
    public void delivered(Long receiverId, Long upToId) {
        Instant now = clock.instant();
        if (messages.markDeliveredUpTo(receiverId, upToId, now) > 0) { // committed by the repository
            messaging.convertAndSend(TOPIC, new ChatDeliveredDto(receiverId, upToId, now));
        }
    }

    /** {@code username} just opened the app: everything waiting for them has arrived. */
    public void deliveredAllTo(String username) {
        users.findByUsername(username).ifPresent(u -> delivered(u.getId(), Long.MAX_VALUE));
    }
}
