package com.memocat.petitbac;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.CoupleActivity;
import com.memocat.domain.PetitBacEntry;
import com.memocat.domain.PetitBacGame;
import com.memocat.domain.PetitBacRound;
import com.memocat.domain.User;
import com.memocat.petitbac.PetitBacDtos.GameDto;
import com.memocat.petitbac.PetitBacDtos.RoundDto;
import com.memocat.repository.PetitBacEntryRepository;
import com.memocat.repository.PetitBacGameRepository;
import com.memocat.repository.PetitBacRoundRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ForbiddenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PetitBacServiceTest {

    private static final List<String> CATEGORIES = List.of("Prénom", "Pays", "Animal");

    @Mock private PetitBacGameRepository games;
    @Mock private PetitBacRoundRepository rounds;
    @Mock private PetitBacEntryRepository entries;
    @Mock private UserRepository users;
    @Mock private ApplicationEventPublisher events;

    private final List<PetitBacGame> savedGames = new ArrayList<>();
    private final List<PetitBacRound> savedRounds = new ArrayList<>();
    private final List<PetitBacEntry> savedEntries = new ArrayList<>();
    private final MovingClock clock = new MovingClock(Instant.parse("2026-10-04T10:00:00Z"));
    private PetitBacService service;
    private User lou;
    private User sam;

    /** A clock the test moves forward. */
    static final class MovingClock extends Clock {
        Instant now;

        MovingClock(Instant now) {
            this.now = now;
        }

        void pass(Duration d) {
            now = now.plus(d);
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

    @BeforeEach
    void setUp() {
        service = new PetitBacService(games, rounds, entries, users, new ObjectMapper().findAndRegisterModules(), events,
                clock, new Random(3));
        lou = user(1L, "lou", "Lou");
        sam = user(2L, "sam", "Sam");
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
        lenient().when(users.findAll()).thenReturn(List.of(lou, sam));
        // A tiny in-memory store behind the three repositories.
        lenient().when(games.save(any())).thenAnswer(i -> keep(i.getArgument(0), savedGames));
        lenient().when(games.findById(anyLong())).thenAnswer(i -> savedGames.stream()
                .filter(g -> g.getId().equals(i.getArgument(0))).findFirst());
        lenient().when(rounds.save(any())).thenAnswer(i -> keep(i.getArgument(0), savedRounds));
        lenient().when(rounds.findByGameIdOrderByNumber(anyLong())).thenAnswer(i -> savedRounds.stream()
                .filter(r -> r.getGame().getId().equals(i.getArgument(0))).sorted(Comparator.comparingInt(PetitBacRound::getNumber)).toList());
        lenient().when(rounds.findByGameIdIn(anyCollection())).thenAnswer(i -> {
            Collection<Long> ids = i.getArgument(0);
            return savedRounds.stream().filter(r -> ids.contains(r.getGame().getId())).toList();
        });
        lenient().when(rounds.findForUpdate(anyLong(), anyInt())).thenAnswer(i -> savedRounds.stream()
                .filter(r -> r.getGame().getId().equals(i.getArgument(0)) && r.getNumber() == (int) i.getArgument(1)).findFirst());
        lenient().when(entries.save(any())).thenAnswer(i -> keep(i.getArgument(0), savedEntries));
        lenient().when(entries.findByRoundId(anyLong())).thenAnswer(i -> savedEntries.stream()
                .filter(e -> e.getRound().getId().equals(i.getArgument(0))).toList());
        lenient().when(entries.findByRoundIdIn(anyCollection())).thenAnswer(i -> {
            Collection<Long> ids = i.getArgument(0);
            return savedEntries.stream().filter(e -> ids.contains(e.getRound().getId())).toList();
        });
        lenient().when(games.findVisibleTo(anyLong(), any())).thenAnswer(i -> savedGames);
        lenient().when(entries.findOpenStarted()).thenAnswer(i -> savedEntries.stream()
                .filter(e -> e.getDoneAt() == null && e.getRound().getFinishedAt() == null
                        && (e.getStartedAt() != null || e.getRound().getStartedAt() != null)).toList());
        lenient().when(users.findById(anyLong())).thenAnswer(i -> Optional.ofNullable(
                i.getArgument(0).equals(1L) ? lou : i.getArgument(0).equals(2L) ? sam : null));
    }

    private static <T> T keep(T entity, List<T> store) {
        if (ReflectionTestUtils.getField(entity, "id") == null) {
            ReflectionTestUtils.setField(entity, "id", (long) store.size() + 1);
            store.add(entity);
        }
        return entity;
    }

    private static User user(Long id, String name, String display) {
        User u = new User(name, "hash", display);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private static RoundDto last(GameDto g) {
        return g.rounds().get(g.rounds().size() - 1);
    }

    private String letter() {
        return savedRounds.get(savedRounds.size() - 1).getLetter();
    }

    /** Three answers on the round's letter: a first name, a country, an animal. */
    private List<String> on(String... words) {
        return List.of(words);
    }

    @Test
    void directTheLetterShowsOnlyOnceBothAreReady() {
        GameDto g = service.create("lou", "direct", CATEGORIES);
        assertThat(last(g).phase()).isEqualTo("pret");
        assertThat(last(g).letter()).isNull();
        verify(events).publishEvent(any(CoupleActivity.class));

        g = service.ready("lou", g.id(), 1);
        assertThat(last(g).phase()).isEqualTo("pret");
        assertThat(last(g).meReady()).isTrue();
        assertThat(service.get("sam", g.id()).rounds().get(0).themReady()).isTrue();

        g = service.ready("sam", g.id(), 1);
        assertThat(last(g).phase()).isEqualTo("jeu");
        assertThat(last(g).letter()).isEqualTo(letter());
        assertThat(last(g).deadline()).isEqualTo(clock.now.plus(PetitBacRules.DIRECT_MAX));
    }

    @Test
    void directStopLeavesTheOtherTenSeconds() {
        GameDto g = started("direct");
        long id = g.id();
        String l = letter();
        service.answers("sam", g.id(), 1, on(l + "lice", "", ""));
        g = service.done("lou", g.id(), 1, on(l + "a", l + "b", l + "c"));
        assertThat(last(g).phase()).isEqualTo("attente");
        RoundDto samView = last(service.get("sam", g.id()));
        assertThat(samView.phase()).isEqualTo("jeu");
        assertThat(samView.stoppedByThem()).isTrue();
        assertThat(samView.deadline()).isEqualTo(clock.now.plus(PetitBacRules.AFTER_STOP));
        assertThat(samView.theirs()).as("still hidden while Sam writes").isNull();
        assertThat(samView.themFilled()).isEqualTo(3);

        clock.pass(Duration.ofSeconds(5));
        service.answers("sam", g.id(), 1, on(l + "lice", l + "rance", ""));
        clock.pass(Duration.ofSeconds(9)); // past the end and its grace
        assertThatThrownBy(() -> service.answers("sam", id, 1, on("x", "y", "z"))).isInstanceOf(ConflictException.class);
        assertThat(last(service.get("sam", g.id())).phase()).isEqualTo("validation");
        assertThat(last(service.get("sam", g.id())).theirs()).containsExactly(l + "a", l + "b", l + "c");
    }

    @Test
    void ownPaceEachHasThreeMinutes() {
        GameDto g = service.create("lou", "rythme", CATEGORIES);
        g = service.ready("lou", g.id(), 1);
        assertThat(last(g).phase()).isEqualTo("jeu");
        assertThat(last(g).letter()).isEqualTo(letter());
        assertThat(last(service.get("sam", g.id())).letter()).as("Sam has not opened it").isNull();

        clock.pass(PetitBacRules.OWN_PACE); // Lou's time is up without « J'ai fini »
        assertThat(last(service.get("lou", g.id())).phase()).isEqualTo("attente");
        clock.pass(Duration.ofHours(5)); // Sam plays later
        g = service.ready("sam", g.id(), 1);
        assertThat(last(g).phase()).isEqualTo("jeu");
        g = service.done("sam", g.id(), 1, on("", "", ""));
        assertThat(last(g).phase()).isEqualTo("validation");
        ArgumentCaptor<CoupleActivity> sent = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events, atLeastOnce()).publishEvent(sent.capture());
        assertThat(sent.getAllValues()).extracting(CoupleActivity::kind).contains(CoupleActivity.PETIT_BAC_REVIEW);
    }

    @Test
    void pointsAfterBothValidated() {
        GameDto g = started("direct");
        long id = g.id();
        String l = letter();
        String same = l + "abc";
        service.done("lou", g.id(), 1, on(same, l + "louone", "zzz"));
        g = service.done("sam", g.id(), 1, on(same.toUpperCase(), l + "samtwo", l + "samthree"));
        assertThat(last(g).phase()).isEqualTo("validation");
        assertThat(last(g).theirsOnLetter()).containsExactly(true, true, false);

        assertThatThrownBy(() -> service.review("sam", id, 1, List.of(2), false))
                .as("an answer off the letter scores nothing anyway").isInstanceOf(ContentValidationException.class);
        service.review("sam", g.id(), 1, List.of(1), true); // Sam refuses Lou's country
        g = service.review("lou", g.id(), 1, List.of(), true);

        RoundDto r = last(g);
        assertThat(r.phase()).isEqualTo("fini");
        assertThat(r.myPoints()).containsExactly(5, 0, 0);
        assertThat(r.theirPoints()).containsExactly(5, 10, 10);
        assertThat(r.myScore()).isEqualTo(5);
        assertThat(r.theirScore()).isEqualTo(25);
        assertThat(r.theyRefused()).containsExactly(1);
        assertThat(g.myTotal()).isEqualTo(5);
        assertThat(g.theirTotal()).isEqualTo(25);
    }

    @Test
    void aNewRoundOnceTheLastIsCountedWithAnotherLetter() {
        GameDto g = started("direct");
        assertThatThrownBy(() -> service.nextRound("sam", g.id())).isInstanceOf(ConflictException.class);
        service.done("lou", g.id(), 1, null);
        service.done("sam", g.id(), 1, null);
        service.review("lou", g.id(), 1, List.of(), true);
        service.review("sam", g.id(), 1, List.of(), true);
        Set<String> seen = new HashSet<>();
        seen.add(letter());
        GameDto next = service.nextRound("sam", g.id());
        assertThat(next.rounds()).hasSize(2);
        assertThat(last(next).phase()).isEqualTo("pret");
        assertThat(seen.add(letter())).as("not the same letter twice").isTrue();
        assertThat(service.list("lou").get(0).status()).isEqualTo("a-toi");
    }

    @Test
    void wrongInputIsRefused() {
        assertThatThrownBy(() -> service.create("lou", "solo", CATEGORIES)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.create("lou", "direct", List.of("Pays", "Ville"))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.create("lou", "direct", List.of("Pays", "pays", "Ville"))).isInstanceOf(ContentValidationException.class);
        GameDto g = started("direct");
        assertThatThrownBy(() -> service.answers("lou", g.id(), 1, List.of("a"))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.delete("sam", g.id())).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void beforeTheStartNothingCanBeWritten() {
        GameDto g = service.create("lou", "direct", CATEGORIES);
        assertThatThrownBy(() -> service.answers("lou", g.id(), 1, on("a", "b", "c"))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.done("lou", g.id(), 1, null)).isInstanceOf(ConflictException.class);
    }

    @Test
    void aSheetLeftOpenAppClosedIsHandedInAndTheOtherIsTold() {
        GameDto g = service.create("lou", "rythme", CATEGORIES);
        String l = letter();
        service.ready("sam", g.id(), 1);
        service.done("sam", g.id(), 1, on(l + "a", "", ""));
        service.ready("lou", g.id(), 1);
        service.answers("lou", g.id(), 1, on(l + "lou", "", ""));
        assertThat(service.expiredRounds()).isEmpty();

        clock.pass(PetitBacRules.OWN_PACE); // Lou's time is up: still within the network grace
        assertThat(service.expiredRounds()).isEmpty();
        clock.pass(PetitBacRules.NETWORK_GRACE); // Lou closed the app: nobody hands the sheet in
        assertThat(service.expiredRounds()).containsExactly(new PetitBacService.RoundKey(g.id(), 1));

        org.mockito.Mockito.clearInvocations(events);
        assertThat(service.closeExpired(g.id(), 1)).isTrue();
        ArgumentCaptor<CoupleActivity> sent = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events).publishEvent(sent.capture());
        assertThat(sent.getValue().kind()).isEqualTo(CoupleActivity.PETIT_BAC_REVIEW);
        assertThat(sent.getValue().actorId()).as("Sam is told Lou's sheet is in").isEqualTo(lou.getId());

        assertThat(service.closeExpired(g.id(), 1)).as("only once").isFalse();
        assertThat(service.expiredRounds()).isEmpty();
        RoundDto samView = last(service.get("sam", g.id()));
        assertThat(samView.phase()).isEqualTo("validation");
        assertThat(samView.theirs()).as("what Lou had saved").containsExactly(l + "lou", "", "");
    }

    @Test
    void aSheetRunningOutWhileTheOtherHasNotPlayedTellsNobody() {
        GameDto g = service.create("lou", "rythme", CATEGORIES);
        service.ready("lou", g.id(), 1);
        clock.pass(PetitBacRules.OWN_PACE.plus(PetitBacRules.NETWORK_GRACE));
        org.mockito.Mockito.clearInvocations(events);
        assertThat(service.closeExpired(g.id(), 1)).isTrue();
        org.mockito.Mockito.verifyNoInteractions(events);
        assertThat(last(service.get("sam", g.id())).phase()).isEqualTo("pret");
    }

    private GameDto started(String mode) {
        GameDto g = service.create("lou", mode, CATEGORIES);
        service.ready("lou", g.id(), 1);
        return service.ready("sam", g.id(), 1);
    }
}
