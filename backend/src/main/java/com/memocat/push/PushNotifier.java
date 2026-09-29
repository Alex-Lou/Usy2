package com.memocat.push;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.chat.ChatMessageSent;
import com.memocat.chat.ChatReceipts;
import com.memocat.couple.CoupleActivity;
import com.memocat.couple.EventAdded;
import com.memocat.couple.EventReminder;
import com.memocat.domain.PushSubscription;
import com.memocat.domain.User;
import com.memocat.feed.FeedActivity;
import com.memocat.feed.ReactionAdded;
import com.memocat.notification.NotificationService;
import com.memocat.push.dto.PushPayload;
import com.memocat.repository.PushSubscriptionRepository;
import com.memocat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Turns the other person's activity into notifications, once the change is
 * committed, off the request thread: an entry in their bell (NotificationService,
 * the same on all their devices) and a push on their devices, skipped while
 * they are looking at the app. With something to show (the message, the
 * comment…), the push has the sentence as its title and the excerpt as its body.
 * Everything the other one does is sent "high": a phone asleep (Android Doze)
 * shows it at once instead of when it next wakes; only the date reminder of
 * the evening before can wait.
 */
@Component
public class PushNotifier {

    static final String TITLE = "MemoCat";
    /** Adding several items in a row notifies once, not once per item. */
    static final Duration LIST_QUIET = Duration.ofMinutes(10);
    /** "sam. 12 oct." */
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM", Locale.FRENCH);

    private final PushSubscriptionRepository subscriptions;
    private final UserRepository users;
    private final PresenceRegistry presence;
    private final WebPushSender sender;
    private final Previews previews;
    private final NotificationService notifications;
    private final ChatReceipts receipts;
    private final ObjectMapper json;
    private final Clock clock;
    private final Map<Long, Instant> lastListPush = new ConcurrentHashMap<>();

    @Autowired
    public PushNotifier(PushSubscriptionRepository subscriptions, UserRepository users, PresenceRegistry presence,
                        WebPushSender sender, Previews previews, NotificationService notifications,
                        ChatReceipts receipts, ObjectMapper json) {
        this(subscriptions, users, presence, sender, previews, notifications, receipts, json, Clock.systemUTC());
    }

    PushNotifier(PushSubscriptionRepository subscriptions, UserRepository users, PresenceRegistry presence,
                 WebPushSender sender, Previews previews, NotificationService notifications, ChatReceipts receipts,
                 ObjectMapper json, Clock clock) {
        this.subscriptions = subscriptions;
        this.users = users;
        this.presence = presence;
        this.sender = sender;
        this.previews = previews;
        this.notifications = notifications;
        this.receipts = receipts;
        this.json = json;
        this.clock = clock;
    }

    @Async(PushConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onFeedActivity(FeedActivity a) {
        String excerpt = null;
        boolean read = false; // read once, only if someone gets notified
        for (User recipient : othersThan(a.actorId())) {
            boolean theirPost = recipient.getId().equals(a.postAuthorId());
            boolean tagged = a.mentionedIds() != null && a.mentionedIds().contains(recipient.getId());
            boolean answered = recipient.getId().equals(a.replyToId());
            String body = switch (a.kind()) {
                case FeedActivity.POST -> a.actorName() + (tagged ? " t'a identifié·e dans un post 🏷️" : " a publié un nouveau post ✨");
                case FeedActivity.COMMENT -> a.actorName() + (answered ? " a répondu à ton commentaire 💬"
                        : tagged ? " t'a identifié·e dans un commentaire 🏷️"
                        : theirPost ? " a commenté ton post 💬" : " a commenté un post 💬");
                case FeedActivity.REACTION -> theirPost ? a.actorName() + " a réagi " + a.emoji() + " à ton post" : null;
                default -> null;
            };
            if (body != null) {
                boolean comment = FeedActivity.COMMENT.equals(a.kind());
                if (!read) {
                    excerpt = comment ? previews.comment(a.commentId()) : previews.post(a.postId());
                    read = true;
                }
                // Opens that very post (with its comments, on that very comment, for a comment).
                String url = "/posts/" + a.postId() + (comment
                        ? "?comments=1" + (a.commentId() == null ? "" : "&comment=" + a.commentId()) : "");
                // A new comment or reaction must not replace an unread one about the same post.
                String tag = comment ? "comment-" + a.commentId()
                        : FeedActivity.REACTION.equals(a.kind()) ? "post-" + a.postId() + "-reactions" : "post-" + a.postId();
                notify(recipient, alert(body, excerpt, url, tag), true);
            }
        }
    }

    @Async(PushConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onChatMessage(ChatMessageSent event) {
        // Like any messaging app: who, then what they wrote.
        String excerpt = previews.message(event.messageId());
        Alert payload = new Alert(event.senderName() + " t'a envoyé un message 💬", excerpt,
                excerpt == null ? "/chat" : "/chat?m=" + event.messageId(), "chat", event.senderName() + " 💬");
        for (User recipient : othersThan(event.senderId())) {
            boolean pushed = notify(recipient, payload, true);
            // ✓✓: it reached their app (connected) or their phone (push accepted).
            if (event.messageId() != null && (pushed || presence.isConnected(recipient.getUsername()))) {
                receipts.delivered(recipient.getId(), event.messageId());
            }
        }
    }

    /** Only the owner of the message or comment hears about it; the link opens that very one. */
    @Async(PushConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReactionAdded(ReactionAdded r) {
        boolean message = ReactionAdded.MESSAGE.equals(r.target());
        String body = r.actorName() + " a réagi " + r.emoji() + (message ? " à ton message" : " à ton commentaire");
        String url = message ? "/chat?m=" + r.refId() : "/posts/" + r.postId() + "?comments=1&comment=" + r.refId();
        String excerpt = message ? previews.message(r.refId()) : previews.comment(r.refId());
        Alert payload = alert(body, excerpt, url, r.target() + "-reaction-" + r.refId());
        for (User recipient : othersThan(r.actorId())) {
            if (recipient.getId().equals(r.ownerId())) {
                notify(recipient, payload, true);
            }
        }
    }

    @Async(PushConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCoupleActivity(CoupleActivity a) {
        if (CoupleActivity.LIST.equals(a.kind())) {
            if (firstInAWhile(a.refId())) {
                for (User recipient : othersThan(a.actorId())) {
                    // Opens that list in the "Nous" space.
                    notify(recipient, alert(a.actorName() + " a mis à jour la liste « " + a.detail() + " »",
                            "/profile/nous?list=" + a.refId(), "list-" + a.refId()), true);
                }
            }
            return;
        }
        Alert payload = switch (a.kind()) {
            // The "Nous" space shows both moods and the notes; "je pense à toi" opens the chat, to answer.
            case CoupleActivity.MOOD -> alert(a.actorName() + " a changé d'humeur : " + a.detail(),
                    previews.moodLabel(a.actorId()), "/profile/nous", "mood");
            case CoupleActivity.NOTE -> alert(a.actorName() + " t'a laissé un mot 💌", previews.note(a.refId()), "/profile/nous", "note");
            case CoupleActivity.THINKING -> alert(a.actorName() + " pense à toi 💭", "/chat", "thinking");
            // The photo stays secret until the other one posts theirs: only the theme is told.
            case CoupleActivity.CHALLENGE_POSTED -> alert(a.actorName() + " a relevé le défi photo 📸 À toi !",
                    "« " + a.detail() + " »", "/defi", "challenge");
            case CoupleActivity.CHALLENGE_BOTH -> alert(a.actorName() + " a posté sa photo du défi 📸 Découvrez-les !",
                    "« " + a.detail() + " »", "/defi", "challenge");
            case CoupleActivity.QUIZ_CHALLENGE -> alert(a.actorName() + " te lance un défi quiz 🎯 " + a.detail(),
                    "/jeux/quiz", "quiz-" + a.refId());
            case CoupleActivity.QUIZ_DONE -> alert(a.actorName() + " a relevé ton défi quiz 🏁 Qui a gagné ?",
                    "/jeux/quiz?duel=" + a.refId(), "quiz-" + a.refId());
            case CoupleActivity.NOUS_GUESS -> alert(a.actorName() + " a deviné une de tes réponses 💞",
                    "/jeux/nous?v=results&side=them", "nous-" + a.refId());
            case CoupleActivity.NOUS_RESET_ASK -> alert(a.actorName() + " propose de repartir de zéro dans 💞 Nous deux"
                    + (a.detail() == null ? "" : " (" + a.detail() + ")") + " : d'accord ?", "/jeux/nous", "nous-reset");
            case CoupleActivity.NOUS_RESET -> "accepted".equals(a.detail())
                    ? alert(a.actorName() + " a dit oui : on repart de zéro dans 💞 Nous deux ✨", "/jeux/nous", "nous-reset")
                    : "refused".equals(a.detail())
                    ? alert(a.actorName() + " préfère garder vos réponses de 💞 Nous deux", "/jeux/nous", "nous-reset")
                    : null;
            default -> null; // sync-only changes
        };
        if (payload == null) {
            return;
        }
        for (User recipient : othersThan(a.actorId())) {
            notify(recipient, payload, true);
        }
    }

    /** ⚡ A live game waits for someone (invitation, pause, nudge): pushed even if urgent enough to wake. */
    @Async(PushConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLiveNotice(com.memocat.live.LiveEvents.Notice n) {
        users.findById(n.recipientId()).ifPresent(u -> notify(u, alert(n.body(), n.url(), n.tag()), true));
    }

    /** A shared date is tomorrow: both people hear about it, even with the app open. */
    @Async(PushConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEventReminder(EventReminder r) {
        String body = "Demain : " + (r.emoji() == null ? "" : r.emoji() + " ") + r.title()
                + (r.time() == null ? "" : " à " + String.format("%02dh%02d", r.time().getHour(), r.time().getMinute()));
        Alert payload = alert(body, "/dates?event=" + r.eventId(), "event-" + r.eventId());
        for (User recipient : users.findAll()) {
            send(recipient, payload, false);
        }
    }

    /** A new date on the shared calendar: the other person hears what and when. */
    @Async(PushConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEventAdded(EventAdded e) {
        String when = e.day().format(DAY) + (e.time() == null ? ""
                : " à " + String.format("%02dh%02d", e.time().getHour(), e.time().getMinute()));
        String what = (e.emoji() == null ? "" : e.emoji() + " ") + e.title() + " · " + when;
        Alert payload = alert(e.actorName() + " a ajouté une date 📅", what,
                "/dates?event=" + e.eventId(), "event-" + e.eventId());
        for (User recipient : othersThan(e.actorId())) {
            notify(recipient, payload, true);
        }
    }

    /**
     * What to tell: the sentence, an optional excerpt, the page it opens, and a
     * tag (same tag: replaces the previous one, on the phone and in the bell).
     * {@code pushTitle}: another title over the excerpt on the phone (the chat: just the name).
     */
    private record Alert(String text, String excerpt, String url, String tag, String pushTitle) {

        /** The sentence alone, or as the title over the excerpt when there is one. */
        PushPayload push() {
            return excerpt == null
                    ? new PushPayload(TITLE, text, url, tag)
                    : new PushPayload(pushTitle != null ? pushTitle : text, excerpt, url, tag);
        }
    }

    private static Alert alert(String text, String url, String tag) {
        return new Alert(text, null, url, tag, null);
    }

    private static Alert alert(String text, String excerpt, String url, String tag) {
        return new Alert(text, excerpt, url, tag, null);
    }

    private boolean firstInAWhile(Long listId) {
        Instant now = clock.instant();
        Instant previous = lastListPush.put(listId, now);
        return previous == null || !now.isBefore(previous.plus(LIST_QUIET));
    }

    private Iterable<User> othersThan(Long actorId) {
        return users.findAll().stream().filter(u -> !u.getId().equals(actorId)).toList();
    }

    /**
     * Into the bell (every device), and a push unless they are looking at the app right now.
     * @return true when a device's push service accepted it
     */
    private boolean notify(User recipient, Alert alert, boolean urgent) {
        record(recipient, alert);
        return !presence.isLookingAtApp(recipient.getUsername()) && push(recipient, alert, urgent);
    }

    /** Into the bell, and a push even with the app open. */
    private void send(User recipient, Alert alert, boolean urgent) {
        record(recipient, alert);
        push(recipient, alert, urgent);
    }

    private void record(User recipient, Alert alert) {
        notifications.publish(recipient.getUsername(), notifications.record(recipient.getId(), alert.text(), alert.excerpt(), alert.url(), alert.tag()));
    }

    /** @return true when at least one device's push service accepted it. */
    private boolean push(User recipient, Alert alert, boolean urgent) {
        byte[] bytes;
        try {
            bytes = json.writeValueAsBytes(alert.push());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize push payload", e);
        }
        boolean accepted = false;
        for (PushSubscription device : subscriptions.findByUserIdOrderByCreatedAtAsc(recipient.getId())) {
            WebPushSender.Outcome outcome = sender.send(device, bytes, urgent);
            if (outcome == WebPushSender.Outcome.GONE) {
                subscriptions.delete(device);
            }
            accepted |= outcome == WebPushSender.Outcome.DELIVERED;
        }
        return accepted;
    }
}
