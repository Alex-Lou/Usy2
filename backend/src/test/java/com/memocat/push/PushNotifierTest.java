package com.memocat.push;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.chat.ChatMessageSent;
import com.memocat.couple.CoupleActivity;
import com.memocat.couple.EventReminder;
import com.memocat.domain.PushSubscription;
import com.memocat.domain.User;
import com.memocat.feed.FeedActivity;
import com.memocat.feed.ReactionAdded;
import com.memocat.repository.PushSubscriptionRepository;
import com.memocat.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PushNotifierTest {

    @Mock private PushSubscriptionRepository subscriptions;
    @Mock private UserRepository users;
    @Mock private WebPushSender sender;
    @Mock private Previews previews; // no excerpt unless a test says so
    @Mock private com.memocat.notification.NotificationService notifications;
    @Mock private com.memocat.chat.ChatReceipts receipts;

    private final PresenceRegistry presence = new PresenceRegistry();
    private final ObjectMapper json = new ObjectMapper();
    private PushNotifier notifier;

    private final User lou = user(1, "lou", "Lou");
    private final User sam = user(2, "sam", "Sam");
    private final PushSubscription phone = new PushSubscription(sam, "https://fcm.googleapis.com/a", "k", "s");
    private final PushSubscription oldLaptop = new PushSubscription(sam, "https://fcm.googleapis.com/b", "k", "s");

    private static User user(long id, String username, String name) {
        User u = new User(username, "hash", name);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    @BeforeEach
    void setUp() {
        notifier = new PushNotifier(subscriptions, users, presence, sender, previews, notifications, receipts, json);
        lenient().when(users.findAll()).thenReturn(List.of(lou, sam));
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

        notifier.onChatMessage(new ChatMessageSent(1L, "Lou", 40L));

        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("title").asText()).isEqualTo("MemoCat");
        assertThat(payload.get("body").asText()).isEqualTo("Lou t'a envoyé un message 💬");
        assertThat(payload.get("url").asText()).isEqualTo("/chat");
        verify(subscriptions).delete(oldLaptop);
        verify(subscriptions, never()).delete(phone);
        verify(subscriptions, never()).findByUserIdOrderByCreatedAtAsc(1L); // never notify the sender
    }

    @Test
    void aMessageShowsWhoThenWhatTheyWroteAndOpensIt() throws Exception {
        when(previews.message(40L)).thenReturn("On se voit ce soir ?");
        when(sender.send(any(), any(), eq(true))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onChatMessage(new ChatMessageSent(1L, "Lou", 40L));

        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("title").asText()).isEqualTo("Lou 💬");
        assertThat(payload.get("body").asText()).isEqualTo("On se voit ce soir ?");
        assertThat(payload.get("url").asText()).isEqualTo("/chat?m=40");
        verify(notifications).record(2L, "Lou t'a envoyé un message 💬", "On se voit ce soir ?", "/chat?m=40", "chat");
        verify(notifications, never()).record(eq(1L), any(), any(), any(), any()); // never the sender's own bell
    }

    @Test
    void aCommentShowsItsTextUnderTheSentence() throws Exception {
        when(previews.comment(51L)).thenReturn("Trop beau 😍");
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onFeedActivity(new FeedActivity(FeedActivity.COMMENT, 1L, "Lou", 8L, 2L, null, List.of(), 51L, null));

        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("title").asText()).isEqualTo("Lou a commenté ton post 💬");
        assertThat(payload.get("body").asText()).isEqualTo("Trop beau 😍");
    }

    @Test
    void skipsSomeoneAlreadyLookingAtTheApp() {
        presence.report("session", "sam", true);

        notifier.onChatMessage(new ChatMessageSent(1L, "Lou", 40L));

        verify(sender, never()).send(any(), any(), anyBoolean());
        // …but it still goes into the bell, shared by all their devices.
        verify(notifications).record(2L, "Lou t'a envoyé un message 💬", null, "/chat", "chat");
    }

    @Test
    void reactionNotifiesOnlyThePostAuthor() throws Exception {
        notifier.onFeedActivity(new FeedActivity(FeedActivity.REACTION, 1L, "Lou", 7L, 1L, "😍")); // Lou's own post
        verify(sender, never()).send(any(), any(), anyBoolean());

        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);
        notifier.onFeedActivity(new FeedActivity(FeedActivity.REACTION, 1L, "Lou", 8L, 2L, "😍")); // Sam's post

        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("body").asText()).isEqualTo("Lou a réagi 😍 à ton post");
        assertThat(payload.get("tag").asText()).isEqualTo("post-8-reactions"); // never replaces a comment
        assertThat(payload.get("url").asText()).isEqualTo("/posts/8"); // opens that very post
    }

    @Test
    void commentSaysWhosePostItIs() throws Exception {
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onFeedActivity(new FeedActivity(FeedActivity.COMMENT, 1L, "Lou", 8L, 2L, null));

        assertThat(sentPayload(phone).get("body").asText()).isEqualTo("Lou a commenté ton post 💬");
        assertThat(sentPayload(phone).get("url").asText()).isEqualTo("/posts/8?comments=1"); // with its comments open
    }

    @Test
    void aReplyOrATagSaysSoAndOpensTheVeryComment() throws Exception {
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onFeedActivity(new FeedActivity(FeedActivity.COMMENT, 1L, "Lou", 8L, 1L, null, java.util.List.of(2L), 51L, 2L));
        assertThat(sentPayload(phone).get("body").asText()).isEqualTo("Lou a répondu à ton commentaire 💬");
        assertThat(sentPayload(phone).get("url").asText()).isEqualTo("/posts/8?comments=1&comment=51");
    }

    @Test
    void aTagInAPostSaysSo() throws Exception {
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onFeedActivity(new FeedActivity(FeedActivity.POST, 1L, "Lou", 8L, 1L, null, java.util.List.of(2L), null, null));
        assertThat(sentPayload(phone).get("body").asText()).isEqualTo("Lou t'a identifié·e dans un post 🏷️");
    }

    @Test
    void reactionsOpenTheVeryMessageOrComment() throws Exception {
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onReactionAdded(new ReactionAdded(ReactionAdded.MESSAGE, 1L, "Lou", 2L, "😂", 40L, null));
        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("body").asText()).isEqualTo("Lou a réagi 😂 à ton message");
        assertThat(payload.get("url").asText()).isEqualTo("/chat?m=40");
    }

    @Test
    void commentReactionLinksToTheCommentInItsPost() throws Exception {
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onReactionAdded(new ReactionAdded(ReactionAdded.COMMENT, 1L, "Lou", 2L, "❤️", 9L, 8L));
        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("body").asText()).isEqualTo("Lou a réagi ❤️ à ton commentaire");
        assertThat(payload.get("url").asText()).isEqualTo("/posts/8?comments=1&comment=9");
    }

    @Test
    void listNotificationOpensThatList() throws Exception {
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onCoupleActivity(new CoupleActivity(CoupleActivity.LIST, 1L, "Lou", "Courses", 3L));
        assertThat(sentPayload(phone).get("url").asText()).isEqualTo("/profile/nous?list=3");
    }

    @Test
    void coupleChangesUseShortNeutralTexts() throws Exception {
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onCoupleActivity(new CoupleActivity(CoupleActivity.MOOD, 1L, "Lou", "😴", null));
        assertThat(sentPayload(phone).get("body").asText()).isEqualTo("Lou a changé d'humeur : 😴");
    }

    @Test
    void aNoteShowsItsTextAndOpensTheNousSpace() throws Exception {
        when(previews.note(5L)).thenReturn("Bonne journée mon chat");
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onCoupleActivity(new CoupleActivity(CoupleActivity.NOTE, 1L, "Lou", null, 5L));

        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("title").asText()).isEqualTo("Lou t'a laissé un mot 💌");
        assertThat(payload.get("body").asText()).isEqualTo("Bonne journée mon chat");
        assertThat(payload.get("url").asText()).isEqualTo("/profile/nous");
        assertThat(payload.get("tag").asText()).isEqualTo("note");
    }

    @Test
    void aMoodCarriesItsFewWords() throws Exception {
        when(previews.moodLabel(1L)).thenReturn("crevée");
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onCoupleActivity(new CoupleActivity(CoupleActivity.MOOD, 1L, "Lou", "😴", null));

        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("title").asText()).isEqualTo("Lou a changé d'humeur : 😴");
        assertThat(payload.get("body").asText()).isEqualTo("crevée");
    }

    @Test
    void aNewDateTellsWhatAndWhenAndOpensIt() throws Exception {
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onEventAdded(new com.memocat.couple.EventAdded(4L, 1L, "Lou", "Resto", "🍝",
                java.time.LocalDate.of(2026, 10, 10), LocalTime.of(20, 30)));

        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("title").asText()).isEqualTo("Lou a ajouté une date 📅");
        assertThat(payload.get("body").asText()).isEqualTo("🍝 Resto · sam. 10 oct. à 20h30");
        assertThat(payload.get("url").asText()).isEqualTo("/dates?event=4");
    }

    @Test
    void thinkingOfYouReachesTheOtherPerson() throws Exception {
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onCoupleActivity(new CoupleActivity(CoupleActivity.THINKING, 1L, "Lou", null, null));

        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("body").asText()).isEqualTo("Lou pense à toi 💭");
        assertThat(payload.get("tag").asText()).isEqualTo("thinking");
    }

    @Test
    void listBurstNotifiesOnceThenAgainAfterAQuietWhile() {
        MutableClock clock = new MutableClock(Instant.parse("2026-09-23T10:00:00Z"));
        PushNotifier throttled = new PushNotifier(subscriptions, users, presence, sender, previews, notifications, receipts, json, clock);
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);
        CoupleActivity added = new CoupleActivity(CoupleActivity.LIST, 1L, "Lou", "Courses", 3L);

        throttled.onCoupleActivity(added);
        clock.now = clock.now.plusSeconds(60);
        throttled.onCoupleActivity(added); // same burst: silent
        verify(sender, times(1)).send(eq(phone), any(), eq(false));

        clock.now = clock.now.plus(PushNotifier.LIST_QUIET);
        throttled.onCoupleActivity(added);
        verify(sender, times(2)).send(eq(phone), any(), eq(false));
    }

    @Test
    void checkingItemsOffIsSyncOnly() {
        notifier.onCoupleActivity(new CoupleActivity(CoupleActivity.LIST_CHANGE, 1L, "Lou", "Courses", 3L));
        notifier.onCoupleActivity(new CoupleActivity(CoupleActivity.TOGETHER, 1L, "Lou", null, null));

        verify(sender, never()).send(any(), any(), anyBoolean());
    }

    @Test
    void aResetForBothAsksTheOtherOneAndTellsTheAnswer() throws Exception {
        when(sender.send(any(), any(), eq(false))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onCoupleActivity(new CoupleActivity(CoupleActivity.NOUS_RESET_ASK, 1L, "Lou", "💗 Tendres & souvenirs", null));
        assertThat(sentPayload(phone).get("body").asText())
                .isEqualTo("Lou propose de repartir de zéro dans 💞 Nous deux (💗 Tendres & souvenirs) : d'accord ?");
    }

    @Test
    void startingOnesOwnAnswersAgainOrTakingBackAProposalIsSyncOnly() {
        notifier.onCoupleActivity(new CoupleActivity(CoupleActivity.NOUS_RESET, 1L, "Lou", "mine", null));
        notifier.onCoupleActivity(new CoupleActivity(CoupleActivity.NOUS_RESET, 1L, "Lou", "cancelled", null));

        verify(sender, never()).send(any(), any(), anyBoolean());
    }

    @Test
    void dateReminderReachesBothEvenWithTheAppOpen() throws Exception {
        PushSubscription louPhone = new PushSubscription(lou, "https://fcm.googleapis.com/c", "k", "s");
        when(subscriptions.findByUserIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(louPhone));
        presence.report("session", "sam", true);

        notifier.onEventReminder(new EventReminder(4L, "Resto", "🍝", LocalTime.of(20, 30)));

        verify(sender).send(eq(louPhone), any(), eq(false));
        JsonNode payload = sentPayload(phone);
        assertThat(payload.get("body").asText()).isEqualTo("Demain : 🍝 Resto à 20h30");
        assertThat(payload.get("url").asText()).isEqualTo("/dates?event=4");
        assertThat(payload.get("tag").asText()).isEqualTo("event-4");
    }

    @Test
    void aMessageAcceptedByTheirPhoneCountsAsReceived() {
        when(sender.send(any(), any(), eq(true))).thenReturn(WebPushSender.Outcome.DELIVERED);

        notifier.onChatMessage(new ChatMessageSent(1L, "Lou", 40L));

        verify(receipts).delivered(2L, 40L);
    }

    @Test
    void aMessageToAnOpenAppCountsAsReceivedWithoutPush() {
        presence.report("session", "sam", true); // looking at the app: no push, but it arrives live

        notifier.onChatMessage(new ChatMessageSent(1L, "Lou", 40L));

        verify(receipts).delivered(2L, 40L);
    }

    @Test
    void nowhereToArriveStaysSent() {
        when(sender.send(any(), any(), eq(true))).thenReturn(WebPushSender.Outcome.FAILED);

        notifier.onChatMessage(new ChatMessageSent(1L, "Lou", 40L));

        verify(receipts, never()).delivered(any(), any());
    }

    private static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
