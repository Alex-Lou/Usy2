package com.memocat.quiz;

import com.memocat.domain.QuizProgress;
import com.memocat.domain.QuizSelfAnswer;
import com.memocat.domain.User;
import com.memocat.quiz.dto.QuizDtos;
import com.memocat.repository.QuizProgressRepository;
import com.memocat.repository.QuizSelfAnswerRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class QuizServiceTest {

    private final QuizBank bank = new QuizBank();
    private final UserRepository users = mock(UserRepository.class);
    private final QuizProgressRepository progress = mock(QuizProgressRepository.class);
    private final QuizSelfAnswerRepository selfAnswers = mock(QuizSelfAnswerRepository.class);
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
    private final QuizService quiz = new QuizService(bank, users, progress, selfAnswers, clock);
    private final User lou = new User("lou", "h", "Lou");
    private final User sam = new User("sam", "h", "Sam");
    private final List<QuizProgress> saved = new ArrayList<>();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(lou, "id", 1L);
        ReflectionTestUtils.setField(sam, "id", 2L);
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
        when(users.findAll()).thenReturn(List.of(lou, sam));
        when(progress.findByUserId(1L)).thenAnswer(i -> saved);
        when(progress.findByUserIdAndLevelKey(any(), any())).thenAnswer(i ->
                saved.stream().filter(p -> p.getLevelKey().equals(i.getArgument(1))).findFirst());
        when(progress.save(any())).thenAnswer(i -> {
            QuizProgress p = i.getArgument(0);
            if (!saved.contains(p)) {
                saved.add(p);
            }
            return p;
        });
    }

    /** Plays a whole level, answering right {@code rightCount} times (it learns the right index from each answer). */
    private QuizDtos.Result play(String theme, int level, int rightCount) {
        QuizDtos.Run run = quiz.start("lou", new QuizDtos.Start(theme, level));
        QuizDtos.Answered a = null;
        for (int i = 0; i < QuizService.PER_RUN; i++) {
            now = now.plusSeconds(2);
            // -1 = time ran out: a sure wrong answer
            a = quiz.answer("lou", run.id(), i < rightCount ? rightIndex(run.id()) : -1);
        }
        return a.result();
    }

    @SuppressWarnings("unchecked")
    private int rightIndex(String runId) {
        var runs = (java.util.Map<String, Object>) ReflectionTestUtils.getField(quiz, "runs");
        Object run = runs.get(runId);
        List<Object> items = (List<Object>) ReflectionTestUtils.getField(run, "items");
        int index = (int) ReflectionTestUtils.getField(run, "index");
        return (int) ReflectionTestUtils.invokeMethod(items.get(index), "correct");
    }

    @Test
    void aQuestionComesWithoutItsAnswerAndOptionsAreShuffledKeepingTheRightOne() {
        QuizDtos.Run run = quiz.start("lou", new QuizDtos.Start("histoire", 1));
        assertThat(run.question().options()).hasSize(4);
        assertThat(run.question().total()).isEqualTo(10);
        int right = rightIndex(run.id());
        String rightText = run.question().options().get(right);
        assertThat(bank.level("histoire", 1)).anySatisfy(q -> assertThat(q.options().get(0)).isEqualTo(rightText));
    }

    @Test
    void aGoodRunGivesThreeStarsAndOpensTheNextLevel() {
        assertThatThrownBy(() -> quiz.start("lou", new QuizDtos.Start("geo", 2))).isInstanceOf(ConflictException.class);

        QuizDtos.Result result = play("geo", 1, 10);

        assertThat(result.stars()).isEqualTo(3);
        assertThat(result.correct()).isEqualTo(10);
        assertThat(result.unlockedNext()).isTrue();
        assertThat(result.score()).isGreaterThan(1000);
        assertThat(quiz.start("lou", new QuizDtos.Start("geo", 2)).level()).isEqualTo(2);
    }

    @Test
    void starsFollowTheRightAnswers() {
        assertThat(play("sport", 1, 4).stars()).isZero();
        assertThat(play("sport", 1, 5).stars()).isEqualTo(1);
        assertThat(play("sport", 1, 7).stars()).isEqualTo(2);
        assertThat(saved).singleElement().satisfies(p -> assertThat(p.getStars()).isEqualTo(2));
    }

    @Test
    void anAnswerAfterTheTimeIsUpIsWrong() {
        QuizDtos.Run run = quiz.start("lou", new QuizDtos.Start("musique", 1));
        int right = rightIndex(run.id());
        now = now.plus(Duration.ofSeconds(QuizService.SECONDS + 10));
        QuizDtos.Answered a = quiz.answer("lou", run.id(), right);
        assertThat(a.correct()).isFalse();
        assertThat(a.correctIndex()).isEqualTo(right);
        assertThat(a.gained()).isZero();
    }

    @Test
    void aRunIsOnlyMineAndChoicesAreChecked() {
        QuizDtos.Run run = quiz.start("lou", new QuizDtos.Start("cinema", 1));
        assertThatThrownBy(() -> quiz.answer("sam", run.id(), 0)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> quiz.answer("lou", run.id(), 7)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> quiz.start("lou", new QuizDtos.Start("nope", 1))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> quiz.start("lou", new QuizDtos.Start("cinema", 9))).isInstanceOf(ContentValidationException.class);
    }

    @Test
    void toiEtMoiNeedsThePartnersAnswersThenAsksAboutThem() {
        when(selfAnswers.findByUserId(2L)).thenReturn(List.of());
        assertThatThrownBy(() -> quiz.start("lou", new QuizDtos.Start("toi", null))).isInstanceOf(ConflictException.class);

        when(selfAnswers.findByUserId(2L)).thenReturn(List.of(
                new QuizSelfAnswer(sam, "saison", 2), new QuizSelfAnswer(sam, "repas", 0), new QuizSelfAnswer(sam, "animal", 1)));
        QuizDtos.Run run = quiz.start("lou", new QuizDtos.Start("toi", null));

        assertThat(run.question().about()).isEqualTo("Sam");
        assertThat(run.question().total()).isEqualTo(3);
        String text = run.question().text();
        int expected = text.startsWith("Saison") ? 2 : text.startsWith("Repas") ? 0 : 1;
        assertThat(quiz.answer("lou", run.id(), expected).correct()).isTrue();
    }

    @Test
    void myOwnAnswersAreCheckedAndKept() {
        when(selfAnswers.findByUserIdAndQuestionId(1L, "saison")).thenReturn(Optional.empty());
        quiz.selfAnswer("lou", new QuizDtos.SelfAnswer("saison", 3));
        assertThatThrownBy(() -> quiz.selfAnswer("lou", new QuizDtos.SelfAnswer("saison", 4))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> quiz.selfAnswer("lou", new QuizDtos.SelfAnswer("inconnue", 0))).isInstanceOf(ContentValidationException.class);
    }
}
