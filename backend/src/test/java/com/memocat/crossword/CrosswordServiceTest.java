package com.memocat.crossword;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.CoupleActivity;
import com.memocat.crossword.CrosswordDtos.Change;
import com.memocat.domain.CrosswordGame;
import com.memocat.domain.User;
import com.memocat.repository.CrosswordGameRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ForbiddenException;
import com.memocat.web.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CrosswordServiceTest {

    @Mock private CrosswordGameRepository games;
    @Mock private UserRepository users;
    @Mock private ApplicationEventPublisher events;

    private CrosswordService service;
    private User lou;
    private User sam;

    @BeforeEach
    void setUp() {
        service = new CrosswordService(games, users, new ArrowWords(), new ObjectMapper().findAndRegisterModules(), events,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC), new Random(7));
        lou = user(1L, "lou", "Lou");
        sam = user(2L, "sam", "Sam");
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
        lenient().when(games.save(any())).thenAnswer(i -> {
            CrosswordGame g = i.getArgument(0);
            ReflectionTestUtils.setField(g, "id", 9L);
            return g;
        });
    }

    private static User user(Long id, String name, String display) {
        User u = new User(name, "hash", display);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    /** A tiny grid "#AB" / "#C#": cells 1, 2 and 4 hold letters. */
    private CrosswordGame tiny(boolean shared) {
        CrosswordGame g = new CrosswordGame(lou, "petite", "melange", "facile", shared, 3, 2, "[]", "#AB#C#", Instant.now());
        ReflectionTestUtils.setField(g, "id", 5L);
        lenient().when(games.findForUpdate(5L)).thenReturn(Optional.of(g));
        lenient().when(games.findById(5L)).thenReturn(Optional.of(g));
        return g;
    }

    @Test
    void aNewGridIsEmptyAndASharedOneInvitesTheOther() {
        var game = service.create("lou", "moyenne", true, "cuisine", "difficile");
        assertThat(game.width()).isEqualTo(9);
        assertThat(game.height()).isEqualTo(11);
        assertThat(game.letters()).doesNotContainPattern("[A-Z]");
        assertThat(game.clues()).isNotEmpty();
        assertThat(game.theme()).isEqualTo("cuisine");
        assertThat(game.level()).isEqualTo("difficile");
        ArgumentCaptor<CoupleActivity> sent = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events).publishEvent(sent.capture());
        assertThat(sent.getValue().kind()).isEqualTo(CoupleActivity.CROSSWORD);
    }

    @Test
    void aSoloGridTellsNobody() {
        service.create("lou", "petite", false, null, null);
        verify(events, never()).publishEvent(any());
    }

    @Test
    void lettersAreSavedWithWhoTypedThem() {
        CrosswordGame g = tiny(true);
        var ping = service.play("sam", 5L, List.of(new Change(1, "a", false), new Change(2, "É", false)));
        assertThat(g.getLetters()).isEqualTo("#AE#.#");
        assertThat(g.getAuthors()).isEqualTo(".bb...");
        assertThat(ping.cells()).hasSize(2);
        assertThat(ping.shared()).isTrue();
    }

    @Test
    void theRightGridFinishesAndTellsTheOther() {
        CrosswordGame g = tiny(true);
        service.play("lou", 5L, List.of(new Change(1, "A", false), new Change(2, "B", false)));
        assertThat(g.getFinishedAt()).isNull();
        var ping = service.play("lou", 5L, List.of(new Change(4, "C", false)));
        assertThat(ping.finishedAt()).isNotNull();
        verify(events).publishEvent(any(CoupleActivity.class));
        assertThatThrownBy(() -> service.play("lou", 5L, List.of(new Change(4, "", false))))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void aRevealedLetterStays() {
        CrosswordGame g = tiny(false);
        service.play("lou", 5L, List.of(new Change(2, null, true)));
        assertThat(g.getLetters()).isEqualTo("#.B#.#");
        assertThat(g.getAuthors().charAt(2)).isEqualTo('*');
        service.play("lou", 5L, List.of(new Change(2, "Z", false)));
        assertThat(g.getLetters().charAt(2)).isEqualTo('B');
    }

    @Test
    void erasingEmptiesTheCell() {
        CrosswordGame g = tiny(false);
        service.play("lou", 5L, List.of(new Change(1, "X", false)));
        service.play("lou", 5L, List.of(new Change(1, "", false)));
        assertThat(g.getLetters()).isEqualTo("#..#.#");
        assertThat(g.getAuthors()).isEqualTo("......");
    }

    @Test
    void onlyLetterCellsAndSingleLetters() {
        tiny(false);
        assertThatThrownBy(() -> service.play("lou", 5L, List.of(new Change(0, "A", false))))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.play("lou", 5L, List.of(new Change(1, "AB", false))))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.play("lou", 5L, List.of(new Change(1, "7", false))))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void aSoloGridIsPrivateAndOnlyItsOwnerDeletesIt() {
        tiny(false);
        assertThatThrownBy(() -> service.get("sam", 5L)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.play("sam", 5L, List.of(new Change(1, "A", false))))
                .isInstanceOf(ResourceNotFoundException.class);
        tiny(true);
        assertThatThrownBy(() -> service.delete("sam", 5L)).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void unknownSizeThemeOrLevelIsRefused() {
        assertThatThrownBy(() -> service.create("lou", "geante", false, null, null)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.create("lou", "petite", false, "espace", null)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.create("lou", "petite", false, null, "extreme")).isInstanceOf(ContentValidationException.class);
    }

    @Test
    void theLevelChoosesWordsAndClues() {
        var words = new ArrowWords();
        var easy = service.entries("melange", CrosswordService.Level.FACILE);
        var hard = service.entries("melange", CrosswordService.Level.DIFFICILE);
        assertThat(hard.size()).isGreaterThan(easy.size());
        var easyClue = new java.util.HashMap<String, String>();
        var hardClue = new java.util.HashMap<String, String>();
        words.words().forEach(w -> { easyClue.put(w.word(), w.easy()); hardClue.put(w.word(), w.hard()); });
        assertThat(easy).allMatch(e -> e.clue().equals(easyClue.get(e.word())) && !e.favored());
        assertThat(hard).allMatch(e -> e.clue().equals(hardClue.get(e.word())));
        assertThat(service.entries("sport", CrosswordService.Level.MOYEN)).anyMatch(ArrowGenerator.Entry::favored);
    }

    /** In a theme grid, the long words all belong to the theme; the short ones hold the grid together. */
    @Test
    void aThemeGridIsMadeOfItsThemeWords() {
        var entries = service.entries("cuisine", CrosswordService.Level.FACILE);
        assertThat(entries).filteredOn(e -> e.word().length() > CrosswordService.THEME_GLUE_LENGTH)
                .isNotEmpty().allMatch(ArrowGenerator.Entry::favored);
        assertThat(entries).anyMatch(e -> !e.favored());

        var game = service.create("lou", "grande", false, "cuisine", "facile");
        assertThat(game.width()).isEqualTo(9);
        assertThat(game.height()).isEqualTo(13);
        var cuisine = new java.util.HashSet<String>();
        new ArrowWords().words().stream().filter(w -> w.themes().contains("cuisine")).forEach(w -> cuisine.add(w.word()));
        var grid = new ArrowGrid(game.width(), game.height(), game.solution(), game.clues());
        assertThat(game.clues()).map(c -> ArrowGeneratorTest.answer(grid, c))
                .filteredOn(a -> a.length() > CrosswordService.THEME_GLUE_LENGTH)
                .isNotEmpty().allMatch(cuisine::contains);
    }

    @Test
    void theGridOfTheDayIsMadeOnceSharedAndTold() {
        LocalDate today = LocalDate.parse("2026-10-01"); // a Thursday, Paris time
        when(games.findByDailyDate(today)).thenReturn(Optional.empty());
        when(games.saveAndFlush(any())).thenAnswer(i -> {
            CrosswordGame g = i.getArgument(0);
            ReflectionTestUtils.setField(g, "id", 11L);
            return g;
        });
        assertThat(service.daily("sam").gameId()).as("looking creates nothing").isNull();

        var game = service.playDaily("lou");
        assertThat(game.daily()).isEqualTo(today);
        assertThat(game.shared()).isTrue();
        assertThat(game.size()).isEqualTo("moyenne");
        assertThat(game.level()).isEqualTo("moyen");
        ArgumentCaptor<CoupleActivity> sent = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events).publishEvent(sent.capture());
        assertThat(sent.getValue().detail()).isEqualTo("du jour");

        // Sam opens it next: the same grid, nothing new.
        CrosswordGame made = new CrosswordGame(lou, "moyenne", "melange", "moyen", true, 3, 2, "[]", "#AB#C#", Instant.now());
        ReflectionTestUtils.setField(made, "id", 11L);
        made.markDaily(today);
        when(games.findByDailyDate(today)).thenReturn(Optional.of(made));
        assertThat(service.playDaily("sam").id()).isEqualTo(11L);
        verify(games).saveAndFlush(any());
    }

    @Test
    void easyEarlyInTheWeekHardAtTheWeekend() {
        assertThat(CrosswordService.dailyLevel(LocalDate.parse("2026-09-28"))).isEqualTo(CrosswordService.Level.FACILE); // Monday
        assertThat(CrosswordService.dailyLevel(LocalDate.parse("2026-09-30"))).isEqualTo(CrosswordService.Level.MOYEN);
        assertThat(CrosswordService.dailyLevel(LocalDate.parse("2026-10-03"))).isEqualTo(CrosswordService.Level.DIFFICILE);
    }

    @Test
    void theStreakCountsDaysInARowUpToTodayOrYesterday() {
        LocalDate today = LocalDate.parse("2026-10-01");
        when(games.findByDailyDate(today)).thenReturn(Optional.empty());
        // Yesterday and the day before done, then a gap.
        when(games.findFinishedDays(any())).thenReturn(List.of(today.minusDays(1), today.minusDays(2), today.minusDays(4)));
        var daily = service.daily("lou");
        assertThat(daily.streak()).as("today's not done yet: the streak still holds").isEqualTo(2);
        assertThat(daily.finished()).isFalse();

        CrosswordGame done = tiny(true);
        done.markDaily(today);
        done.write("#AB#C#", ".aa.a.", Instant.now());
        when(games.findByDailyDate(today)).thenReturn(Optional.of(done));
        when(games.findFinishedDays(any())).thenReturn(List.of(today, today.minusDays(1), today.minusDays(2), today.minusDays(4)));
        daily = service.daily("lou");
        assertThat(daily.finished()).isTrue();
        assertThat(daily.progress()).isEqualTo(100);
        assertThat(daily.streak()).isEqualTo(3);

        when(games.findFinishedDays(any())).thenReturn(List.of(today.minusDays(2)));
        when(games.findByDailyDate(today)).thenReturn(Optional.empty());
        assertThat(service.daily("lou").streak()).as("yesterday missed: back to zero").isZero();
    }
}
