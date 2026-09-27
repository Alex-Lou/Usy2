package com.memocat.quiz;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.CoupleActivity;
import com.memocat.domain.QuizChallenge;
import com.memocat.domain.User;
import com.memocat.quiz.dto.QuizDtos;
import com.memocat.repository.QuizChallengeRepository;
import com.memocat.repository.QuizProgressRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class QuizChallengeServiceTest {

    private final QuizBank bank = new QuizBank();
    private final UserRepository users = mock(UserRepository.class);
    private final QuizProgressRepository progress = mock(QuizProgressRepository.class);
    private final QuizChallengeRepository repo = mock(QuizChallengeRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
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
    private final QuizService quiz = new QuizService(bank, users, progress, clock);
    private final QuizChallengeService duels = new QuizChallengeService(quiz, repo, users, events, new ObjectMapper(), clock);
    private final User lou = new User("lou", "h", "Lou");
    private final User sam = new User("sam", "h", "Sam");
    private final List<QuizChallenge> stored = new ArrayList<>();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(lou, "id", 1L);
        ReflectionTestUtils.setField(sam, "id", 2L);
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
        when(users.findAll()).thenReturn(List.of(lou, sam));
        when(users.getReferenceById(1L)).thenReturn(lou);
        when(users.getReferenceById(2L)).thenReturn(sam);
        when(progress.findByUserId(any())).thenReturn(List.of());
        when(repo.save(any())).thenAnswer(i -> {
            QuizChallenge c = i.getArgument(0);
            if (c.getId() == null) {
                ReflectionTestUtils.setField(c, "id", (long) stored.size() + 1);
                stored.add(c);
            }
            return c;
        });
        when(repo.findById(anyLong())).thenAnswer(i -> stored.stream().filter(c -> c.getId().equals(i.getArgument(0))).findFirst());
        when(repo.countByFromUserIdAndFinishedAtIsNull(any())).thenAnswer(i ->
                stored.stream().filter(c -> c.getFromUser().getId().equals(i.getArgument(0)) && !c.isFinished()).count());
    }

    /** Answers {@code count} questions of a run (right ones where {@code right} says so); returns the last answer. */
    private QuizDtos.Answered answer(String who, QuizDtos.Run run, int count, boolean right) {
        QuizDtos.Answered a = null;
        for (int i = 0; i < count; i++) {
            now = now.plusSeconds(2);
            a = quiz.answer(who, run.id(), right ? rightIndex(run.id()) : -1);
        }
        return a;
    }

    @SuppressWarnings("unchecked")
    private int rightIndex(String runId) {
        var runs = (Map<String, Object>) ReflectionTestUtils.getField(quiz, "runs");
        Object run = runs.get(runId);
        List<Object> items = (List<Object>) ReflectionTestUtils.getField(run, "items");
        int index = (int) ReflectionTestUtils.getField(run, "index");
        return (int) ReflectionTestUtils.invokeMethod(items.get(index), "correct");
    }

    @Test
    void theDuelIsOnlySentOnceTheChallengerFinishes() {
        QuizDtos.Run run = duels.create("lou", new QuizDtos.Start(QuizChallengeService.MIX, null));
        answer("lou", run, 9, true);
        assertThat(stored).isEmpty();
        verify(events, never()).publishEvent(any(Object.class));

        QuizDtos.Answered last = answer("lou", run, 1, true);

        assertThat(last.result().challengeId()).isEqualTo(1L);
        assertThat(last.result().challengeDone()).isFalse();
        assertThat(stored).singleElement().satisfies(c -> {
            assertThat(c.getFromMarks()).isEqualTo("1111111111");
            assertThat(c.getToUser()).isSameAs(sam);
        });
        verify(events).publishEvent(any(CoupleActivity.class));
    }

    @Test
    void theOtherOneGetsTheVerySameQuestionsAndTheBestScoreWins() {
        QuizDtos.Run mine = duels.create("lou", new QuizDtos.Start(QuizChallengeService.MIX, null));
        List<String> asked = new ArrayList<>();
        asked.add(mine.question().text() + mine.question().options());
        QuizDtos.Answered a = null;
        for (int i = 0; i < 10; i++) {
            now = now.plusSeconds(2);
            a = quiz.answer("lou", mine.id(), i < 5 ? rightIndex(mine.id()) : -1);
            if (a.next() != null) {
                asked.add(a.next().text() + a.next().options());
            }
        }

        QuizDtos.Run theirs = duels.play("sam", 1L);
        List<String> seen = new ArrayList<>();
        seen.add(theirs.question().text() + theirs.question().options());
        for (int i = 0; i < 10; i++) {
            now = now.plusSeconds(2);
            a = quiz.answer("sam", theirs.id(), rightIndex(theirs.id()));
            if (a.next() != null) {
                seen.add(a.next().text() + a.next().options());
            }
        }

        assertThat(seen).isEqualTo(asked);
        assertThat(a.result().challengeDone()).isTrue();
        QuizDtos.Duel duel = duels.duel("sam", 1L);
        assertThat(duel.challenge().outcome()).isEqualTo("win");
        assertThat(duels.duel("lou", 1L).challenge().outcome()).isEqualTo("lose");
        assertThat(duel.lines()).hasSize(10).allSatisfy(l -> assertThat(l.mine()).isTrue());
        assertThat(duels.duel("lou", 1L).lines()).extracting(QuizDtos.DuelLine::mine)
                .containsExactly(true, true, true, true, true, false, false, false, false, false);
    }

    @Test
    void aClosedAppPicksUpAtTheNextQuestionNeverOneAlreadyAnswered() {
        QuizDtos.Run mine = duels.create("lou", new QuizDtos.Start(QuizChallengeService.MIX, null));
        answer("lou", mine, 10, true);

        QuizDtos.Run first = duels.play("sam", 1L);
        answer("sam", first, 3, true);
        assertThat(stored.get(0).getToMarks()).isEqualTo("111");

        QuizDtos.Run again = duels.play("sam", 1L);

        assertThat(again.question().index()).isEqualTo(4);
        assertThatThrownBy(() -> quiz.answer("sam", first.id(), 0)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void onlyTheOneDefiedPlaysItOnceAndTheResultStaysHiddenUntilThen() {
        QuizDtos.Run mine = duels.create("lou", new QuizDtos.Start(QuizChallengeService.MIX, null));
        answer("lou", mine, 10, false);

        assertThatThrownBy(() -> duels.play("lou", 1L)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> duels.duel("sam", 1L)).isInstanceOf(ConflictException.class);

        answer("sam", duels.play("sam", 1L), 10, false);

        assertThatThrownBy(() -> duels.play("sam", 1L)).isInstanceOf(ConflictException.class);
        assertThat(duels.duel("lou", 1L).challenge().outcome()).isEqualTo("tie");
    }

    @Test
    void aLevelDuelNeedsThatLevelOpenAndTheQueueIsBounded() {
        assertThatThrownBy(() -> duels.create("lou", new QuizDtos.Start("geo", 2))).isInstanceOf(ConflictException.class);
        for (int i = 0; i < QuizChallengeService.MAX_OPEN; i++) {
            answer("lou", duels.create("lou", new QuizDtos.Start("geo", 1)), 10, true);
        }
        assertThatThrownBy(() -> duels.create("lou", new QuizDtos.Start("geo", 1))).isInstanceOf(ConflictException.class);
    }
}
