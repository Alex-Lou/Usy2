package com.memocat.nous;

import com.memocat.couple.CoupleActivity;
import com.memocat.domain.NousAnswer;
import com.memocat.domain.NousGuess;
import com.memocat.domain.NousMark;
import com.memocat.domain.User;
import com.memocat.nous.dto.NousDtos;
import com.memocat.repository.NousAnswerRepository;
import com.memocat.repository.NousGuessRepository;
import com.memocat.repository.NousMarkRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 💞 Nous deux, with in-memory repositories: answers stay hidden until guessed, verdicts, marks. */
class NousServiceTest {

    private final NousBank bank = new NousBank();
    private final UserRepository users = mock(UserRepository.class);
    private final NousAnswerRepository answers = mock(NousAnswerRepository.class);
    private final NousGuessRepository guesses = mock(NousGuessRepository.class);
    private final NousMarkRepository marks = mock(NousMarkRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final NousService nous = new NousService(bank, users, answers, guesses, marks, events,
            Clock.fixed(Instant.parse("2026-09-26T10:00:00Z"), ZoneOffset.UTC));
    private final User lou = new User("lou", "h", "Lou");
    private final User sam = new User("sam", "h", "Sam");
    private final List<NousAnswer> savedAnswers = new ArrayList<>();
    private final List<NousGuess> savedGuesses = new ArrayList<>();
    private final List<NousMark> savedMarks = new ArrayList<>();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(lou, "id", 1L);
        ReflectionTestUtils.setField(sam, "id", 2L);
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
        when(users.findAll()).thenReturn(List.of(lou, sam));
        when(answers.findByUserId(anyLong())).thenAnswer(i -> savedAnswers.stream().filter(a -> a.getUser().getId().equals(i.getArgument(0))).toList());
        when(answers.findByUserIdAndQuestionId(anyLong(), anyString())).thenAnswer(i -> savedAnswers.stream()
                .filter(a -> a.getUser().getId().equals(i.getArgument(0)) && a.getQuestionId().equals(i.getArgument(1))).findFirst());
        when(answers.save(any())).thenAnswer(i -> {
            NousAnswer a = i.getArgument(0);
            if (!savedAnswers.contains(a)) {
                savedAnswers.add(a);
            }
            return a;
        });
        when(guesses.save(any())).thenAnswer(i -> {
            NousGuess g = i.getArgument(0);
            if (g.getId() == null) {
                ReflectionTestUtils.setField(g, "id", (long) savedGuesses.size() + 1);
                savedGuesses.add(g);
            }
            return g;
        });
        when(guesses.findById(anyLong())).thenAnswer(i -> savedGuesses.stream().filter(g -> g.getId().equals(i.getArgument(0))).findFirst());
        when(guesses.findByGuesserIdAndQuestionId(anyLong(), anyString())).thenAnswer(i -> savedGuesses.stream()
                .filter(g -> g.getGuesser().getId().equals(i.getArgument(0)) && g.getQuestionId().equals(i.getArgument(1))).findFirst());
        when(guesses.findByGuesserIdOrderByCreatedAtDesc(anyLong())).thenAnswer(i -> savedGuesses.stream()
                .filter(g -> g.getGuesser().getId().equals(i.getArgument(0))).toList());
        when(guesses.findByAuthorIdOrderByCreatedAtDesc(anyLong())).thenAnswer(i -> savedGuesses.stream()
                .filter(g -> g.getAuthor().getId().equals(i.getArgument(0))).toList());
        doAnswer(i -> savedGuesses.removeIf(g -> g.getAuthor().getId().equals(i.getArgument(0)) && g.getQuestionId().equals(i.getArgument(1))))
                .when(guesses).deleteByAuthorIdAndQuestionId(anyLong(), anyString());
        when(marks.findAll()).thenAnswer(i -> List.copyOf(savedMarks));
        when(marks.findByUserIdAndQuestionIdAndKind(anyLong(), anyString(), anyString())).thenAnswer(i -> savedMarks.stream()
                .filter(m -> m.getUser().getId().equals(i.getArgument(0)) && m.getQuestionId().equals(i.getArgument(1))
                        && m.getKind().equals(i.getArgument(2))).findFirst());
        when(marks.save(any())).thenAnswer(i -> {
            savedMarks.add(i.getArgument(0));
            return i.getArgument(0);
        });
        doAnswer(i -> savedMarks.remove((NousMark) i.getArgument(0))).when(marks).delete(any(NousMark.class));
    }

    @Test
    void anAnswerStaysHiddenUntilGuessedThenAChoiceIsJudgedAtOnce() {
        nous.answer("sam", new NousDtos.Answer("saison", List.of(2), null));

        assertThat(nous.toGuess("lou")).singleElement().satisfies(q -> assertThat(q.id()).isEqualTo("saison"));
        NousDtos.Reveal r = nous.guess("lou", new NousDtos.Answer("saison", List.of(2), null));

        assertThat(r.verdict()).isEqualTo(NousGuess.RIGHT);
        assertThat(r.answerChoices()).containsExactly(2);
        assertThat(nous.toGuess("lou")).isEmpty();
        assertThatThrownBy(() -> nous.guess("lou", new NousDtos.Answer("saison", List.of(1), null))).isInstanceOf(ConflictException.class);
        assertThat(nous.overview("lou").me().percent()).isEqualTo(100);
        verify(events, never()).publishEvent(any(Object.class));
    }

    @Test
    void severalTicksScoreTheirShareInCommon() {
        nous.answer("sam", new NousDtos.Answer("film", List.of(0, 5, 10), null));
        nous.answer("sam", new NousDtos.Answer("vacances", List.of(0, 1, 2), null));
        nous.answer("sam", new NousDtos.Answer("musique", List.of(1, 4), null));
        nous.answer("sam", new NousDtos.Answer("couleur", List.of(0), null));
        assertThat(nous.mine("sam", "general").stream().filter(m -> m.id().equals("film")).findFirst().orElseThrow().choices())
                .containsExactly(0, 5, 10);

        NousDtos.Reveal all = nous.guess("lou", new NousDtos.Answer("film", List.of(10, 0, 5), null));
        assertThat(all.verdict()).isEqualTo(NousGuess.RIGHT);
        assertThat(all.points()).isEqualTo(100);
        NousDtos.Reveal two = nous.guess("lou", new NousDtos.Answer("vacances", List.of(0, 1), null));  // 2 in common of 3
        assertThat(two.verdict()).isEqualTo(NousGuess.CLOSE);
        assertThat(two.points()).isEqualTo(67);
        assertThat(two.common()).isEqualTo(2);
        assertThat(two.union()).isEqualTo(3);
        NousDtos.Reveal one = nous.guess("lou", new NousDtos.Answer("musique", List.of(1, 2), null));    // 1 in common of 3
        assertThat(one.verdict()).isEqualTo(NousGuess.SOME);
        assertThat(one.points()).isEqualTo(33);
        NousDtos.Reveal none = nous.guess("lou", new NousDtos.Answer("couleur", List.of(3, 4), null));
        assertThat(none.verdict()).isEqualTo(NousGuess.WRONG);
        assertThat(none.points()).isZero();
        assertThat(none.guessChoices()).containsExactly(3, 4);
        assertThat(none.answerChoices()).containsExactly(0);

        NousDtos.Score score = nous.overview("lou").me();
        assertThat(score.percent()).isEqualTo(50); // (100 + 67 + 33 + 0) / 4
        assertThat(List.of(score.right(), score.close(), score.some(), score.wrong())).containsExactly(1, 1, 1, 1);
        verify(events, never()).publishEvent(any(Object.class));
    }

    @Test
    void theShareCountsExtraTicksAsMuchAsMissingOnes() {
        assertThat(NousService.verdict(0b1111, 0b0111)).isEqualTo(NousGuess.CLOSE); // 3 of 4: 75 %
        assertThat(NousService.verdict(0b1001, 0b0111)).isEqualTo(NousGuess.SOME);  // 1 of 4: 25 %
        assertThat(NousService.verdict(0b0001, 0b0011)).isEqualTo(NousGuess.CLOSE); // 1 of 2: 50 %
    }

    @Test
    void wordsWaitForTheVerdictOfThePersonItIsAbout() {
        nous.answer("sam", new NousDtos.Answer("t05", null, "  Mon cœur  "));
        NousDtos.Reveal r = nous.guess("lou", new NousDtos.Answer("t05", null, "Chaton"));

        assertThat(r.verdict()).isNull();
        assertThat(r.answerText()).isEqualTo("Mon cœur");
        verify(events).publishEvent(any(CoupleActivity.class));
        assertThat(nous.overview("sam").toJudge()).isEqualTo(1);

        assertThatThrownBy(() -> nous.judge("lou", r.guessId(), new NousDtos.Judge("right", null))).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> nous.judge("sam", r.guessId(), new NousDtos.Judge("bof", null))).isInstanceOf(ContentValidationException.class);
        NousDtos.Reveal judged = nous.judge("sam", r.guessId(), new NousDtos.Judge("close", "Presque, mais c'est « mon cœur » 😘"));

        assertThat(judged.verdict()).isEqualTo(NousGuess.CLOSE);
        assertThat(nous.overview("lou").me().percent()).isEqualTo(50);
        assertThat(nous.history("sam").theirs()).singleElement().satisfies(x -> assertThat(x.guessText()).isEqualTo("Chaton"));
    }

    @Test
    void changingAnAnswerClearsTheGuessesAboutIt() {
        nous.answer("sam", new NousDtos.Answer("saison", List.of(2), null));
        nous.guess("lou", new NousDtos.Answer("saison", List.of(0), null));
        nous.answer("sam", new NousDtos.Answer("saison", List.of(2), null));
        assertThat(savedGuesses).hasSize(1); // same answer: kept

        nous.answer("sam", new NousDtos.Answer("saison", List.of(3), null));

        assertThat(savedGuesses).isEmpty();
        assertThat(nous.toGuess("lou")).hasSize(1);
    }

    @Test
    void badAnswersAreRefused() {
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("saison", List.of(4), null))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("saison", List.of(), null))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("saison", null, null))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("t05", null, "   "))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("t05", null, "x".repeat(281)))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("t23", null, "juste pour parler"))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("nope", List.of(0), null))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.guess("lou", new NousDtos.Answer("saison", List.of(0), null))).isInstanceOf(ConflictException.class);
    }

    @Test
    void favouritesAreMineAndTalkedAboutIsShared() {
        nous.mark("lou", new NousDtos.Mark("t23", NousMark.FAV, true));
        nous.mark("lou", new NousDtos.Mark("t23", NousMark.TALKED, true));

        NousDtos.Card forSam = nous.cards("sam", "tendre").stream().filter(c -> c.id().equals("t23")).findFirst().orElseThrow();
        assertThat(forSam.fav()).isFalse();
        assertThat(forSam.talked()).isTrue();

        nous.mark("sam", new NousDtos.Mark("t23", NousMark.TALKED, false));
        assertThat(nous.cards("lou", "tendre").stream().filter(c -> c.id().equals("t23")).findFirst().orElseThrow().talked()).isFalse();
    }
}
