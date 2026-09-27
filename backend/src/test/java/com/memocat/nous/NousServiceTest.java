package com.memocat.nous;

import com.memocat.couple.CoupleActivity;
import com.memocat.domain.NousAnswer;
import com.memocat.domain.NousGuess;
import com.memocat.domain.NousMark;
import com.memocat.domain.NousReset;
import com.memocat.domain.User;
import com.memocat.nous.dto.NousDtos;
import com.memocat.repository.NousAnswerRepository;
import com.memocat.repository.NousGuessRepository;
import com.memocat.repository.NousMarkRepository;
import com.memocat.repository.NousResetRepository;
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
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 💞 Nous deux, with in-memory repositories: answers stay hidden until guessed, verdicts, marks, formats, resets. */
class NousServiceTest {

    /** One question of each new kind, next to the real ones. */
    private static final List<NousBank.Question> EXTRA = List.of(
            new NousBank.Question("xu", "general", NousBank.ONE, "Pizza ou sushi ?", List.of("Pizza", "Sushi")),
            new NousBank.Question("xe", "general", NousBank.SCALE, "Jaloux·se ?", List.of("Pas du tout", "Très")),
            new NousBank.Question("xo", "general", NousBank.RANK, "Tes priorités ?", List.of("Famille", "Travail", "Amis", "Loisirs")),
            new NousBank.Question("xh", "general", NousBank.HANGMAN, "Ton dessert, en un mot ?", List.of()),
            new NousBank.Question("xm", "general", NousBank.SHORT, "Ta ville de cœur ?", List.of()),
            new NousBank.Question("xf", "tendre", NousBank.FILL, "Je craque toujours pour ___", List.of()));
    private final NousBank bank = withExtra(new NousBank());
    private final NousResetRepository resets = mock(NousResetRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final NousAnswerRepository answers = mock(NousAnswerRepository.class);
    private final NousGuessRepository guesses = mock(NousGuessRepository.class);
    private final NousMarkRepository marks = mock(NousMarkRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final NousService nous = new NousService(bank, users, answers, guesses, marks, resets, events,
            Clock.fixed(Instant.parse("2026-09-26T10:00:00Z"), ZoneOffset.UTC));
    private final User lou = new User("lou", "h", "Lou");
    private final User sam = new User("sam", "h", "Sam");
    private final List<NousAnswer> savedAnswers = new ArrayList<>();
    private final List<NousGuess> savedGuesses = new ArrayList<>();
    private final List<NousMark> savedMarks = new ArrayList<>();
    private final List<NousReset> savedResets = new ArrayList<>();

    private static NousBank withExtra(NousBank real) {
        NousBank b = spy(real);
        List<NousBank.Question> all = Stream.concat(real.all().stream(), EXTRA.stream()).toList();
        doReturn(all).when(b).all();
        doAnswer(i -> all.stream().filter(q -> q.id().equals(i.getArgument(0))).findFirst()).when(b).question(any());
        return b;
    }

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
        doAnswer(i -> savedAnswers.removeIf(a -> a.getUser().getId().equals(i.getArgument(0))
                && ((Collection<?>) i.getArgument(1)).contains(a.getQuestionId()))).when(answers).deleteByUserIdAndQuestionIdIn(anyLong(), any());
        doAnswer(i -> savedAnswers.removeIf(a -> a.getUser().getId().equals(i.getArgument(0)))).when(answers).deleteByUserId(anyLong());
        doAnswer(i -> savedGuesses.removeIf(g -> g.getAuthor().getId().equals(i.getArgument(0))
                && ((Collection<?>) i.getArgument(1)).contains(g.getQuestionId()))).when(guesses).deleteByAuthorIdAndQuestionIdIn(anyLong(), any());
        doAnswer(i -> savedGuesses.removeIf(g -> g.getGuesser().getId().equals(i.getArgument(0))
                && ((Collection<?>) i.getArgument(1)).contains(g.getQuestionId()))).when(guesses).deleteByGuesserIdAndQuestionIdIn(anyLong(), any());
        doAnswer(i -> savedGuesses.removeIf(g -> g.getAuthor().getId().equals(i.getArgument(0)))).when(guesses).deleteByAuthorId(anyLong());
        doAnswer(i -> savedGuesses.removeIf(g -> g.getGuesser().getId().equals(i.getArgument(0)))).when(guesses).deleteByGuesserId(anyLong());
        when(resets.findFirstByOrderByCreatedAtDesc()).thenAnswer(i -> savedResets.stream().findFirst());
        when(resets.save(any())).thenAnswer(i -> {
            savedResets.add(i.getArgument(0));
            return i.getArgument(0);
        });
        doAnswer(i -> savedResets.remove((NousReset) i.getArgument(0))).when(resets).delete(any(NousReset.class));
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

    @Test
    void oneChoiceAScaleAndARankingAreJudgedAtOnce() {
        nous.answer("sam", new NousDtos.Answer("xu", List.of(1), null));
        nous.answer("sam", new NousDtos.Answer("xe", List.of(7), null));
        nous.answer("sam", new NousDtos.Answer("xo", List.of(2, 0, 3, 1), null));
        assertThat(nous.mine("sam", "general").stream().filter(m -> m.id().equals("xo")).findFirst().orElseThrow().choices())
                .containsExactly(2, 0, 3, 1);

        assertThat(nous.guess("lou", new NousDtos.Answer("xu", List.of(0), null)).verdict()).isEqualTo(NousGuess.WRONG);
        NousDtos.Reveal scale = nous.guess("lou", new NousDtos.Answer("xe", List.of(5), null)); // 2 steps apart
        assertThat(scale.verdict()).isEqualTo(NousGuess.CLOSE);
        assertThat(scale.points()).isEqualTo(60);
        assertThat(scale.answerChoices()).containsExactly(7);
        NousDtos.Reveal rank = nous.guess("lou", new NousDtos.Answer("xo", List.of(2, 0, 1, 3), null)); // 2 of 4 well placed
        assertThat(rank.verdict()).isEqualTo(NousGuess.CLOSE);
        assertThat(rank.points()).isEqualTo(50);
        assertThat(rank.guessChoices()).containsExactly(2, 0, 1, 3);
        assertThat(rank.answerChoices()).containsExactly(2, 0, 3, 1);
        assertThat(nous.overview("lou").me().percent()).isEqualTo(37); // (0 + 60 + 50) / 3
        verify(events, never()).publishEvent(any(Object.class));
    }

    @Test
    void oneChoiceAScaleAndARankingRefuseWhatDoesntFit() {
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("xu", List.of(0, 1), null))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("xu", List.of(2), null))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("xe", List.of(11), null))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("xo", List.of(0, 1, 2), null))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("xo", List.of(0, 1, 1, 2), null))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("xh", null, "3 glaces"))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> nous.answer("lou", new NousDtos.Answer("xm", null, "x".repeat(41)))).isInstanceOf(ContentValidationException.class);
    }

    @Test
    void aHangmanIsPlayedLetterByLetterWithoutEverSendingTheWord() {
        nous.answer("sam", new NousDtos.Answer("xh", null, "Crêpe"));
        assertThat(nous.toGuess("lou")).singleElement().satisfies(q -> {
            assertThat(q.pattern()).isEqualTo("_____");
            assertThat(q.tried()).isEmpty();
        });
        assertThatThrownBy(() -> nous.guess("lou", new NousDtos.Answer("xh", null, "crepe"))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> nous.letter("lou", new NousDtos.Letter("xh", "7"))).isInstanceOf(ContentValidationException.class);

        NousDtos.HangmanState s = nous.letter("lou", new NousDtos.Letter("xh", "é"));
        assertThat(s.pattern()).isEqualTo("__E_E");
        assertThat(s.reveal()).isNull();
        nous.letter("lou", new NousDtos.Letter("xh", "z"));
        nous.letter("lou", new NousDtos.Letter("xh", "z")); // twice the same: one error
        assertThat(nous.toGuess("lou")).singleElement().satisfies(q -> assertThat(q.tried()).isEqualTo("EZ"));
        assertThat(nous.history("lou").mine()).isEmpty();
        assertThat(nous.overview("sam").toJudge()).isZero();

        nous.letter("lou", new NousDtos.Letter("xh", "c"));
        nous.letter("lou", new NousDtos.Letter("xh", "r"));
        NousDtos.HangmanState end = nous.letter("lou", new NousDtos.Letter("xh", "P"));

        assertThat(end.pattern()).isEqualTo("CREPE");
        assertThat(end.errors()).isEqualTo(1);
        assertThat(end.reveal().verdict()).isEqualTo(NousGuess.RIGHT);
        assertThat(end.reveal().points()).isEqualTo(90);
        assertThat(end.reveal().answerText()).isEqualTo("Crêpe");
        assertThat(nous.toGuess("lou")).isEmpty();
        assertThatThrownBy(() -> nous.letter("lou", new NousDtos.Letter("xh", "a"))).isInstanceOf(ConflictException.class);
        verify(events, never()).publishEvent(any(Object.class));
    }

    @Test
    void sevenWrongLettersAndTheHangmanIsLost() {
        nous.answer("sam", new NousDtos.Answer("xh", null, "Tarte"));
        NousDtos.HangmanState s = null;
        for (String l : List.of("b", "c", "d", "f", "g", "h", "i")) {
            s = nous.letter("lou", new NousDtos.Letter("xh", l));
        }
        assertThat(s.errors()).isEqualTo(Hangman.MAX_ERRORS);
        assertThat(s.reveal().verdict()).isEqualTo(NousGuess.WRONG);
        assertThat(s.reveal().points()).isZero();
        assertThat(nous.overview("lou").me().percent()).isZero();
    }

    @Test
    void aShortAnswerIsRightAtOnceWhenItIsTheSameWordElseTheOtherOneJudges() {
        nous.answer("sam", new NousDtos.Answer("xm", null, "Montréal"));
        nous.answer("sam", new NousDtos.Answer("xf", null, "les fossettes"));

        assertThat(nous.guess("lou", new NousDtos.Answer("xm", null, " montreal ")).verdict()).isEqualTo(NousGuess.RIGHT);
        NousDtos.Reveal fill = nous.guess("lou", new NousDtos.Answer("xf", null, "les yeux"));
        assertThat(fill.verdict()).isNull();
        verify(events).publishEvent(any(CoupleActivity.class));
        assertThat(nous.judge("sam", fill.guessId(), new NousDtos.Judge("wrong", null)).verdict()).isEqualTo(NousGuess.WRONG);
    }

    @Test
    void startingMyAnswersAgainTakesTheGuessesBothWaysInThatThemeOnly() {
        nous.answer("lou", new NousDtos.Answer("saison", List.of(1), null)); // general
        nous.answer("lou", new NousDtos.Answer("xf", null, "ton rire"));      // tendre
        nous.answer("sam", new NousDtos.Answer("xu", List.of(0), null));      // general
        nous.guess("sam", new NousDtos.Answer("saison", List.of(1), null));
        nous.guess("lou", new NousDtos.Answer("xu", List.of(0), null));
        assertThatThrownBy(() -> nous.resetMine("lou", "nope")).isInstanceOf(ContentValidationException.class);

        nous.resetMine("lou", "general");

        assertThat(savedAnswers).extracting(NousAnswer::getQuestionId).containsExactlyInAnyOrder("xf", "xu");
        assertThat(savedGuesses).isEmpty();
        assertThat(nous.toGuess("lou")).extracting(NousDtos.ToGuess::id).containsExactly("xu");

        nous.resetMine("lou", null);
        assertThat(savedAnswers).extracting(NousAnswer::getQuestionId).containsExactly("xu");
    }

    @Test
    void startingAgainForBothWaitsForTheOtherOnesYes() {
        nous.answer("lou", new NousDtos.Answer("saison", List.of(1), null));
        nous.answer("sam", new NousDtos.Answer("saison", List.of(2), null));
        nous.answer("sam", new NousDtos.Answer("xf", null, "ton rire"));

        NousDtos.ResetState asked = nous.proposeReset("lou", new NousDtos.ResetRequest("general"));
        assertThat(asked.mine()).isTrue();
        assertThat(nous.overview("sam").reset()).satisfies(r -> {
            assertThat(r.mine()).isFalse();
            assertThat(r.byName()).isEqualTo("Lou");
            assertThat(r.theme()).isEqualTo("general");
        });
        assertThat(savedAnswers).hasSize(3); // nothing erased yet
        assertThatThrownBy(() -> nous.acceptReset("lou")).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> nous.proposeReset("sam", new NousDtos.ResetRequest(null))).isInstanceOf(ConflictException.class);

        nous.acceptReset("sam");

        assertThat(savedAnswers).extracting(NousAnswer::getQuestionId).containsExactly("xf");
        assertThat(nous.overview("lou").reset()).isNull();
        assertThatThrownBy(() -> nous.acceptReset("sam")).isInstanceOf(ResourceNotFoundException.class);

        nous.proposeReset("sam", new NousDtos.ResetRequest(""));
        nous.dropReset("lou"); // no, thanks
        assertThat(savedResets).isEmpty();
        assertThat(savedAnswers).hasSize(1);
    }

    @Test
    void scoresByThemeAndTheirAnswersStayLockedUntilGuessed() {
        nous.answer("lou", new NousDtos.Answer("saison", List.of(1), null));
        nous.answer("sam", new NousDtos.Answer("saison", List.of(1), null));
        nous.answer("lou", new NousDtos.Answer("xu", List.of(0), null));
        nous.answer("sam", new NousDtos.Answer("xu", List.of(1), null));
        nous.answer("sam", new NousDtos.Answer("xf", null, "ton rire"));

        List<NousDtos.Compare> before = nous.compare("lou", "general");
        assertThat(before).extracting(NousDtos.Compare::id).containsExactly("saison", "xu");
        assertThat(before).allSatisfy(c -> {
            assertThat(c.locked()).isTrue();
            assertThat(c.theirs()).isNull();
            assertThat(c.same()).isNull();
        });

        nous.guess("lou", new NousDtos.Answer("saison", List.of(1), null));
        nous.guess("lou", new NousDtos.Answer("xu", List.of(0), null));

        List<NousDtos.Compare> after = nous.compare("lou", null);
        assertThat(after).extracting(NousDtos.Compare::id).containsExactly("saison", "xu", "xf");
        NousDtos.Compare saison = after.get(0);
        assertThat(saison.locked()).isFalse();
        assertThat(saison.theirs().choices()).containsExactly(1);
        assertThat(saison.same()).isTrue();
        assertThat(saison.myVerdict()).isEqualTo(NousGuess.RIGHT);
        assertThat(after.get(1).same()).isFalse();
        assertThat(after.get(2)).satisfies(c -> {
            assertThat(c.mine()).isNull();
            assertThat(c.locked()).isTrue();
        });

        NousDtos.Scores scores = nous.scores("lou");
        assertThat(scores.me().percent()).isEqualTo(50);
        assertThat(scores.agreement()).isEqualTo(new NousDtos.Agreement(1, 2, 50));
        NousDtos.ThemeScore general = scores.themes().stream().filter(t -> t.id().equals("general")).findFirst().orElseThrow();
        assertThat(general.me().percent()).isEqualTo(50);
        assertThat(general.myAnswers()).isEqualTo(2);
        assertThat(general.theirAnswers()).isEqualTo(2);
        NousDtos.ThemeScore tendre = scores.themes().stream().filter(t -> t.id().equals("tendre")).findFirst().orElseThrow();
        assertThat(tendre.me().percent()).isNull();
        assertThat(tendre.theirAnswers()).isEqualTo(1);
        assertThat(tendre.agreement().percent()).isNull();
    }
}
