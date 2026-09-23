package com.memocat.push;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.chat.ChatMessageSent;
import com.memocat.domain.PushSubscription;
import com.memocat.domain.User;
import com.memocat.feed.FeedActivity;
import com.memocat.push.dto.PushPayload;
import com.memocat.repository.PushSubscriptionRepository;
import com.memocat.repository.UserRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Turns the other person's activity into push notifications on their devices,
 * once the change is committed, off the request thread. Skips anyone currently
 * looking at the app (the in-app bell already shows it). Texts match the
 * in-app bell (NotificationsListener).
 */
@Component
public class PushNotifier {

    static final String TITLE = "MemoCat";

    private final PushSubscriptionRepository subscriptions;
    private final UserRepository users;
    private final PresenceRegistry presence;
    private final WebPushSender sender;
    private final ObjectMapper json;

    public PushNotifier(PushSubscriptionRepository subscriptions, UserRepository users, PresenceRegistry presence,
                        WebPushSender sender, ObjectMapper json) {
        this.subscriptions = subscriptions;
        this.users = users;
        this.presence = presence;
        this.sender = sender;
        this.json = json;
    }

    @Async(PushConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onFeedActivity(FeedActivity a) {
        for (User recipient : othersThan(a.actorId())) {
            boolean theirPost = recipient.getId().equals(a.postAuthorId());
            String body = switch (a.kind()) {
                case FeedActivity.POST -> a.actorName() + " a publié un nouveau post ✨";
                case FeedActivity.COMMENT -> a.actorName() + (theirPost ? " a commenté ton post 💬" : " a commenté un post 💬");
                case FeedActivity.REACTION -> theirPost ? a.actorName() + " a réagi " + a.emoji() + " à ton post" : null;
                default -> null;
            };
            if (body != null) {
                notify(recipient, new PushPayload(TITLE, body, "/", "post-" + a.postId()), false);
            }
        }
    }

    @Async(PushConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onChatMessage(ChatMessageSent event) {
        for (User recipient : othersThan(event.senderId())) {
            notify(recipient, new PushPayload(TITLE, event.senderName() + " t'a envoyé un message 💬", "/chat", "chat"), true);
        }
    }

    private Iterable<User> othersThan(Long actorId) {
        return users.findAll().stream().filter(u -> !u.getId().equals(actorId)).toList();
    }

    private void notify(User recipient, PushPayload payload, boolean urgent) {
        if (presence.isLookingAtApp(recipient.getUsername())) {
            return;
        }
        byte[] bytes;
        try {
            bytes = json.writeValueAsBytes(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize push payload", e);
        }
        for (PushSubscription device : subscriptions.findByUserIdOrderByCreatedAtAsc(recipient.getId())) {
            if (sender.send(device, bytes, urgent) == WebPushSender.Outcome.GONE) {
                subscriptions.delete(device);
            }
        }
    }
}
