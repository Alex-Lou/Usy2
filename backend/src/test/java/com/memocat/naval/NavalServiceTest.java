package com.memocat.naval;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.domain.NavalGame;
import com.memocat.domain.User;
import com.memocat.repository.NavalGameRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
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

/** 🚢 The battleship rules, on an in-memory repository. */
class NavalServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final NavalGameRepository repo = mock(NavalGameRepository.class);
    private final List<Object> published = new ArrayList<>();
    private final ApplicationEventPublisher events = published::add;
    private final NavalService naval = new NavalService(repo, users, events, new ObjectMapper(),
            Clock.fixed(Instant.parse("2026-09-26T10:00:00Z"), ZoneOffset.UTC));
    private final User lou = new User("lou", "h", "Lou");
    private final User sam = new User("sam", "h", "Sam");
    private final List<NavalGame> stored = new ArrayList<>();

    /** Ships lying on rows 0, 2, 4, 6, 8 from the left edge: columns 5..9 are always water. */
    private static final NavalDtos.Fleet FLEET = new NavalDtos.Fleet(List.of(
            new NavalDtos.Ship(0, false), new NavalDtos.Ship(20, false), new NavalDtos.Ship(40, false),
            new NavalDtos.Ship(60, false), new NavalDtos.Ship(80, false)));
    private static final List<Integer> SHIP_CELLS = List.of(0, 1, 2, 3, 4, 20, 21, 22, 23, 40, 41, 42, 60, 61, 62, 80, 81);

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(lou, "id", 1L);
        ReflectionTestUtils.setField(sam, "id", 2L);
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
        when(users.findAll()).thenReturn(List.of(lou, sam));
        when(repo.save(any())).thenAnswer(i -> {
            NavalGame g = i.getArgument(0);
            ReflectionTestUtils.setField(g, "id", (long) stored.size() + 1);
            stored.add(g);
            return g;
        });
        when(repo.findById(anyLong())).thenAnswer(i -> stored.stream().filter(g -> g.getId().equals(i.getArgument(0))).findFirst());
        when(repo.findByStatusIn(any())).thenAnswer(i -> {
            Collection<String> statuses = i.getArgument(0);
            return stored.stream().filter(g -> statuses.contains(g.getStatus())).toList();
        });
        when(repo.findTopByOrderByIdDesc()).thenAnswer(i -> stored.stream().max(Comparator.comparing(NavalGame::getId)));
        when(repo.countByWinnerId(any())).thenAnswer(i -> stored.stream()
                .filter(g -> g.getWinner() != null && g.getWinner().getId().equals(i.getArgument(0))).count());
    }

    /** Starts a game with both fleets placed; returns the username who shoots first. */
    private String started(String theme) {
        long id = naval.create("lou", new NavalDtos.Create(theme)).id();
        naval.place("lou", id, FLEET);
        NavalDtos.View v = naval.place("sam", id, FLEET);
        return v.turnId() == 1L ? "lou" : "sam";
    }

    private static String other(String who) {
        return who.equals("lou") ? "sam" : "lou";
    }

    @Test
    void aFleetMustBeFiveShipsInsideTheSeaWithoutOverlapping() {
        assertThatThrownBy(() -> NavalService.fleet(new NavalDtos.Fleet(FLEET.ships().subList(0, 4))))
                .isInstanceOf(ContentValidationException.class);
        List<NavalDtos.Ship> offEdge = new ArrayList<>(FLEET.ships());
        offEdge.set(0, new NavalDtos.Ship(8, false)); // 5 long from column 8
        assertThatThrownBy(() -> NavalService.fleet(new NavalDtos.Fleet(offEdge))).isInstanceOf(ContentValidationException.class);
        List<NavalDtos.Ship> offBottom = new ArrayList<>(FLEET.ships());
        offBottom.set(0, new NavalDtos.Ship(70, true)); // 5 long down from row 7
        assertThatThrownBy(() -> NavalService.fleet(new NavalDtos.Fleet(offBottom))).isInstanceOf(ContentValidationException.class);
        List<NavalDtos.Ship> overlap = new ArrayList<>(FLEET.ships());
        overlap.set(4, new NavalDtos.Ship(3, true)); // crosses the carrier
        assertThatThrownBy(() -> NavalService.fleet(new NavalDtos.Fleet(overlap))).isInstanceOf(ContentValidationException.class);

        List<NavalDtos.Ship> touching = new ArrayList<>(FLEET.ships());
        touching.set(1, new NavalDtos.Ship(10, false)); // right under the carrier: allowed
        assertThat(NavalService.fleet(new NavalDtos.Fleet(touching)).get(1)).containsExactly(10, 11, 12, 13);
        assertThat(NavalService.fleet(new NavalDtos.Fleet(List.of(new NavalDtos.Ship(5, true), new NavalDtos.Ship(0, false),
                new NavalDtos.Ship(20, false), new NavalDtos.Ship(40, false), new NavalDtos.Ship(60, false)))).get(0))
                .containsExactly(5, 15, 25, 35, 45);
    }

    @Test
    void shotsTakeTurnsAndTheOthersShipsStayHiddenUntilSunk() {
        long id = naval.create("lou", new NavalDtos.Create("space")).id();
        NavalDtos.View placed = naval.place("lou", id, FLEET);
        assertThat(placed.status()).isEqualTo(NavalGame.PLACING);
        assertThat(placed.myFleet()).hasSize(5);
        NavalDtos.View samSees = naval.current("sam").orElseThrow();
        assertThat(samSees.themPlaced()).isTrue();
        assertThat(samSees.theirShips()).isEmpty();
        assertThatThrownBy(() -> naval.place("lou", id, FLEET)).isInstanceOf(ConflictException.class);

        NavalDtos.View v = naval.place("sam", id, FLEET);
        assertThat(v.status()).isEqualTo(NavalGame.PLAYING);
        assertThat(v.theme()).isEqualTo("space");
        String first = v.turnId() == 1L ? "lou" : "sam";

        assertThatThrownBy(() -> naval.shoot(other(first), id, new NavalDtos.Shoot(50))).isInstanceOf(ConflictException.class);
        NavalDtos.View hit = naval.shoot(first, id, new NavalDtos.Shoot(80));
        assertThat(hit.myShots()).containsExactly(new NavalDtos.Shot(80, true));
        assertThat(hit.theirShips()).isEmpty(); // hit, not sunk: still hidden
        assertThat(hit.last()).isEqualTo(new NavalDtos.LastShot(hit.meId(), 80, true, null));
        assertThatThrownBy(() -> naval.shoot(first, id, new NavalDtos.Shoot(81))).isInstanceOf(ConflictException.class);

        NavalDtos.View target = naval.shoot(other(first), id, new NavalDtos.Shoot(99));
        assertThat(target.theirShots()).containsExactly(new NavalDtos.Shot(80, true));
        assertThat(target.myFleet().get(4).sunk()).isFalse();
        assertThatThrownBy(() -> naval.shoot(first, id, new NavalDtos.Shoot(80))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> naval.shoot(first, id, new NavalDtos.Shoot(100))).isInstanceOf(ContentValidationException.class);

        NavalDtos.View sunk = naval.shoot(first, id, new NavalDtos.Shoot(81));
        assertThat(sunk.theirShips()).singleElement().satisfies(s -> {
            assertThat(s.type()).isEqualTo(4);
            assertThat(s.cells()).containsExactly(80, 81);
            assertThat(s.sunk()).isTrue();
        });
        assertThat(sunk.last().sunk()).isEqualTo(4);
        assertThat(published).filteredOn(e -> e instanceof com.memocat.live.LiveEvents.Notice).isNotEmpty();
    }

    @Test
    void sinkingTheWholeFleetWinsAndTheWinnerPicksTheNextTheme() {
        String first = started("ocean");
        long id = 1L;
        int miss = 0;
        for (int cell : SHIP_CELLS) {
            NavalDtos.View v = naval.shoot(first, id, new NavalDtos.Shoot(cell));
            if (v.status().equals(NavalGame.DONE)) {
                break;
            }
            naval.shoot(other(first), id, new NavalDtos.Shoot(9 + 10 * (miss % 10) - (miss / 10))); // columns 9 then 8: water
            miss++;
        }
        NavalDtos.View won = naval.current(first).orElseThrow();
        assertThat(won.status()).isEqualTo(NavalGame.DONE);
        assertThat(won.winnerId()).isEqualTo(won.meId());
        assertThat(won.myWins()).isEqualTo(1);
        NavalDtos.View lost = naval.current(other(first)).orElseThrow();
        assertThat(lost.theirShips()).hasSize(5);
        assertThat(lost.theirWins()).isEqualTo(1);

        assertThatThrownBy(() -> naval.chooseTheme(other(first), id, new NavalDtos.Theme("space"))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> naval.chooseTheme(first, id, new NavalDtos.Theme("disco"))).isInstanceOf(ContentValidationException.class);
        assertThat(naval.chooseTheme(first, id, new NavalDtos.Theme("pirate")).nextTheme()).isEqualTo("pirate");

        NavalDtos.View next = naval.create(other(first), new NavalDtos.Create("cartoon")); // the loser's pick doesn't count
        assertThat(next.theme()).isEqualTo("pirate");
        assertThatThrownBy(() -> naval.chooseTheme(first, id, new NavalDtos.Theme("space"))).isInstanceOf(ConflictException.class);
    }

    @Test
    void anAbandonedGameHasNoWinnerAndKeepsTheTheme() {
        started("cartoon");
        NavalDtos.View quit = naval.quit("sam", 1L);
        assertThat(quit.status()).isEqualTo(NavalGame.DONE);
        assertThat(quit.winnerId()).isNull();
        assertThat(quit.endedReason()).isEqualTo("abandon");
        assertThatThrownBy(() -> naval.chooseTheme("lou", 1L, new NavalDtos.Theme("space"))).isInstanceOf(ConflictException.class);
        assertThat(naval.create("sam", new NavalDtos.Create("space")).theme()).isEqualTo("cartoon");
    }

    @Test
    void oneBattleAtATime() {
        naval.create("lou", null);
        assertThatThrownBy(() -> naval.create("sam", null)).isInstanceOf(ConflictException.class);
        assertThat(stored.get(0).getTheme()).isEqualTo("ocean");
        assertThatThrownBy(() -> naval.create("lou", new NavalDtos.Create("disco"))).isInstanceOf(ConflictException.class);
    }
}
