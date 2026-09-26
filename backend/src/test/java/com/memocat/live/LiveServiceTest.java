package com.memocat.live;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.domain.LiveGame;
import com.memocat.domain.User;
import com.memocat.nous.NousBank;
import com.memocat.quiz.QuizBank;
import com.memocat.quiz.QuizService;
import com.memocat.repository.LiveGameRepository;
import com.memocat.repository.QuizProgressRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** ⚡ The live-game rules, on an in-memory repository and a clock we move by hand. */
class LiveServiceTest {

    private Instant now = Instant.parse("2026-09-26T10:00:00Z");
    private final Clock clock = new Clock() {
        @Override
        public ZoneOffset getZone() {
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
    };
    private final UserRepository users = mock(UserRepository.class);
    private final QuizProgressRepository progress = mock(QuizProgressRepository.class);
    private final LiveGameRepository repo = mock(LiveGameRepository.class);
    private final List<Object> published = new ArrayList<>();
    private final ApplicationEventPublisher events = published::add;
    private final QuizService quiz = new QuizService(new QuizBank(), users, progress);
    private final LiveService live = new LiveService(repo, users, quiz, new NousBank(), events, new ObjectMapper(), clock);
    private final User lou = new User("lou", "h", "Lou");
    private final User sam = new User("sam", "h", "Sam");
    private final List<LiveGame> stored = new ArrayList<>();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(lou, "id", 1L);
        ReflectionTestUtils.setField(sam, "id", 2L);
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
        when(users.findAll()).thenReturn(List.of(lou, sam));
        when(progress.findByUserId(any())).thenReturn(List.of());
        when(repo.save(any())).thenAnswer(i -> {
            LiveGame g = i.getArgument(0);
            ReflectionTestUtils.setField(g, "id", (long) stored.size() + 1);
            stored.add(g);
            return g;
        });
        when(repo.findById(anyLong())).thenAnswer(i -> stored.stream().filter(g -> g.getId().equals(i.getArgument(0))).findFirst());
        when(repo.findByStatusIn(any())).thenAnswer(i -> {
            Collection<String> statuses = i.getArgument(0);
            return stored.stream().filter(g -> statuses.contains(g.getStatus())).toList();
        });
        when(repo.findTop10ByOrderByIdDesc()).thenAnswer(i -> stored.stream()
                .sorted(Comparator.comparing(LiveGame::getId).reversed()).limit(10).toList());
    }

    private int right(LiveDtos.View v) {
        List<LiveService.Item> items = readItems(stored.get(0));
        return items.get(v.index()).c();
    }

    @SuppressWarnings("unchecked")
    private List<LiveService.Item> readItems(LiveGame g) {
        try {
            return new ObjectMapper().readValue(g.getItems(), new com.fasterxml.jackson.core.type.TypeReference<List<LiveService.Item>>() {
            });
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private void seconds(long s) {
        now = now.plusSeconds(s);
        live.tick();
    }

    @Test
    void aQuizDuelGoesQuestionByQuestionAndTheAnswersStayHiddenUntilBothHaveAnswered() {
        LiveDtos.View v = live.create("lou", new LiveDtos.Create(LiveService.QUIZ, "mix", null));
        assertThat(v.status()).isEqualTo(LiveGame.INVITED);
        assertThatThrownBy(() -> live.create("sam", new LiveDtos.Create(LiveService.QUIZ, "mix", null))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> live.accept("lou", v.id())).isInstanceOf(ConflictException.class); // only the one invited

        LiveDtos.View q = live.accept("sam", v.id());
        assertThat(q.status()).isEqualTo(LiveGame.PLAYING);
        assertThat(q.question()).isNotNull();
        assertThat(q.total()).isEqualTo(10);

        now = now.plusSeconds(2);
        LiveDtos.View afterLou = live.answer("lou", v.id(), new LiveDtos.Answer(List.of(right(q))));
        assertThat(afterLou.hostAnswered()).isTrue();
        assertThat(afterLou.rounds()).isEmpty(); // Sam can't see Lou's answer yet
        assertThatThrownBy(() -> live.answer("lou", v.id(), new LiveDtos.Answer(List.of(0)))).isInstanceOf(ConflictException.class);

        LiveDtos.View revealed = live.answer("sam", v.id(), new LiveDtos.Answer(List.of((right(q) + 1) % 4)));
        assertThat(revealed.phase()).isEqualTo(LiveGame.REVEAL);
        assertThat(revealed.rounds()).singleElement().satisfies(r -> {
            assertThat(r.hostPoints()).isGreaterThan(100); // right, with a speed bonus
            assertThat(r.guestPoints()).isZero();
        });
        assertThat(revealed.hostScore()).isGreaterThan(100);

        seconds(5);
        LiveDtos.View next = live.get("lou", v.id());
        assertThat(next.phase()).isEqualTo(LiveGame.QUESTION);
        assertThat(next.index()).isEqualTo(1);
    }

    @Test
    void whenSomeoneDoesntAnswerInTimeTheGamePausesAndPicksUpWithAFreshClock() {
        long id = live.create("lou", new LiveDtos.Create(LiveService.QUIZ, "mix", null)).id();
        live.accept("sam", id);
        live.answer("lou", id, new LiveDtos.Answer(List.of(0)));

        seconds(LiveService.QUIZ_SECONDS + 3);
        LiveDtos.View paused = live.get("lou", id);
        assertThat(paused.status()).isEqualTo(LiveGame.PAUSED);
        assertThat(paused.waiting()).containsExactly(2L);
        assertThat(paused.pauseEnds()).isEqualTo(now.plus(LiveService.PAUSE_MAX).toEpochMilli());
        assertThat(published).anySatisfy(e -> assertThat(e).isInstanceOf(LiveEvents.Notice.class));
        assertThatThrownBy(() -> live.resume("lou", id)).isInstanceOf(ConflictException.class); // Lou already answered

        seconds(3 * 3600); // hours later
        LiveDtos.View back = live.resume("sam", id);
        assertThat(back.status()).isEqualTo(LiveGame.PLAYING);
        assertThat(back.index()).isZero();
        assertThat(back.hostAnswered()).isTrue(); // Lou's answer kept
        assertThat(back.deadline()).isEqualTo(now.plusSeconds(LiveService.QUIZ_SECONDS).toEpochMilli());
        assertThat(live.answer("sam", id, new LiveDtos.Answer(List.of(1))).phase()).isEqualTo(LiveGame.REVEAL);
    }

    @Test
    void aPauseLastsADayAtMost() {
        long id = live.create("lou", new LiveDtos.Create(LiveService.QUIZ, "mix", null)).id();
        live.accept("sam", id);
        seconds(LiveService.QUIZ_SECONDS + 3);
        assertThat(live.get("sam", id).waiting()).containsExactlyInAnyOrder(1L, 2L);

        seconds(24 * 3600 + 1);

        LiveDtos.View over = live.get("sam", id);
        assertThat(over.status()).isEqualTo(LiveGame.DONE);
        assertThat(over.endedReason()).isEqualTo("expired");
        assertThat(live.create("sam", new LiveDtos.Create(LiveService.NOUS, null, null)).status()).isEqualTo(LiveGame.INVITED);
    }

    @Test
    void sameWavelengthScoresTheShareOfTicksInCommonForBoth() {
        long id = live.create("sam", new LiveDtos.Create(LiveService.NOUS, "general", null)).id();
        LiveDtos.View q = live.accept("lou", id);
        assertThat(q.total()).isEqualTo(LiveService.NOUS_ROUNDS);
        assertThat(q.question().multi()).isTrue();
        assertThat(q.seconds()).isEqualTo(LiveService.NOUS_SECONDS);
        assertThatThrownBy(() -> live.answer("lou", id, new LiveDtos.Answer(List.of()))).isInstanceOf(ContentValidationException.class);

        live.answer("sam", id, new LiveDtos.Answer(List.of(0, 1)));
        LiveDtos.View r = live.answer("lou", id, new LiveDtos.Answer(List.of(1)));

        assertThat(r.rounds()).singleElement().satisfies(x -> {
            assertThat(x.hostPoints()).isEqualTo(50);
            assertThat(x.guestPoints()).isEqualTo(50);
            assertThat(x.host()).containsExactly(0, 1);
            assertThat(x.guest()).containsExactly(1);
        });
    }

    @Test
    void anInvitationCanBeDeclinedOrExpires() {
        long a = live.create("lou", new LiveDtos.Create(LiveService.QUIZ, "mix", null)).id();
        assertThat(live.decline("sam", a).status()).isEqualTo(LiveGame.CANCELLED);
        long b = live.create("lou", new LiveDtos.Create(LiveService.QUIZ, "mix", null)).id();
        seconds(24 * 3600 + 1);
        assertThat(live.get("lou", b).status()).isEqualTo(LiveGame.CANCELLED);
        assertThat(live.current("lou")).hasValueSatisfying(v -> assertThat(v.id()).isEqualTo(b));
    }
}
