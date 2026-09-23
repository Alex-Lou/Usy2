package com.memocat.push;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.chat.ChatMessageSent;
import com.memocat.domain.PushSubscription;
import com.memocat.domain.User;
import com.memocat.feed.FeedActivity;
import com.memocat.repository.PushSubscriptionRepository;
import com.memocat.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PushNotifierTest {

    @Mock private PushSubscriptionRepository subscriptions;
    @Mock private UserRepository users;
    @Mock private WebPushSender sender;

    private final PresenceRegistry presence = new PresenceRegistry();
    private final ObjectMapper json = new ObjectMapper();
    private PushNotifier notifier;

    private final User lou = user(1, "lou", "Lou");
    private final User mimi = user(2, "mimi", "Mimi");
    private final PushSubscription phone = new PushSubscription(mimi, "https://fcm.googleapis.com/a", "k", "s");
    private final PushSubscription oldLaptop = new PushSubscription(mimi, "https://fcm.googleapis.com/b", "k", "s");

    private static User user(long id, String username, String name) {
        User u = new User(username, "hash", name);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    @BeforeEach
    void setUp() {
        notifier = new PushNotifier(subscriptions, users, presence, sender, json);
        when(users.findAll()).thenReturn(List.of(lou, mimi));
        lenient().when(subscriptions.findByUserIdOrderByCreatedAtAsc(2L)).thenReturn(List.of(phone, oldLaptop));
    }

    private JsonNode sentPayload(PushSubscription device) throws Exception {
        ArgumentCaptor<byte[]> body = ArgumentCaptor.forClass(byte[].class);
        verify(sender).send(eq(device), body.capture(), anyBoolean());
        return json.readTree(body.getValue());
    }

    @Test
    void chatMessageReachesTheOtherPersonsDevicesAndDropsDeadOnes() throws Exception {
        when(sender.send(eq(phone), any(), eq(true))).thenReturn(WebPushSender.Outcome.DELIVERED);
        when(sender.send(eq(oldLaptop), any(), eq(true))).thenReturn(WebPushSender.Outcome.GONE);

        notifier.onChatMessage(new ChatMessageSent(1L, "Lou"));

        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("title").asText()).isEqualTo("MemoCat");
        assertThat(payload.get("body").asText()).isEqualTo("Lou t'a envoyé un message 💬");
        assertThat(payload.get("url").asText()).isEqualTo("/chat");
        verify(subscriptions).delete(oldLaptop);
        verify(subscriptions, never()).delete(phone);
        verify(subscriptions, never()).findByUserIdOrderByCreatedAtAsc(1L); // never notify the sender
    }

    @Test
    void skipsSomeoneAlreadyLookingAtTheApp() {
        presence.report("session", "mimi", true);

        notifier.onChatMessage(new ChatMessageSent(1L, "Lou"));

        verify(sender, never()).send(any(), any(), anyBoolean());
    }

    @Test
    void reactionNotifiesOnlyThePostAuthor() throws Exception {
        notifier.onFeedActivity(new FeedActivity(FeedActivity.REACTION, 1L, "Lou", 7L, 1L, "😍")); // Lou's own post
        verify(sender, never()).send(any(), any(), anyBoolean());

        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);
        notifier.onFeedActivity(new FeedActivity(FeedActivity.REACTION, 1L, "Lou", 8L, 2L, "😍")); // Mimi's post

        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("body").asText()).isEqualTo("Lou a réagi 😍 à ton post");
        assertThat(payload.get("tag").asText()).isEqualTo("post-8");
    }

    @Test
    void commentSaysWhosePostItIs() throws Exception {
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onFeedActivity(new FeedActivity(FeedActivity.COMMENT, 1L, "Lou", 8L, 2L, null));

        assertThat(sentPayload(phone).get("body").asText()).isEqualTo("Lou a commenté ton post 💬");
    }
}
