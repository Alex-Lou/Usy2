package com.memocat.naval;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.domain.NavalGame;
import com.memocat.domain.User;
import com.memocat.live.LiveEvents;
import com.memocat.repository.NavalGameRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 🚢 Battleship between both of us, turn by turn (no clock: the game waits).
 * Both place their fleet (10×10, ships of 5, 4, 3, 3 and 2, touching allowed),
 * a coin toss picks who shoots first, then one shot each in turn until a
 * fleet is sunk. The server keeps both fleets: each one only ever sees the
 * other's ships once sunk. The first game's theme is picked by whoever starts
 * it; then the winner picks the next game's.
 */
@Service
public class NavalService {

    static final int SIZE = 10;
    static final List<Integer> LENGTHS = List.of(5, 4, 3, 3, 2);
    static final List<String> NAMES = List.of("porte-avions", "cuirassé", "croiseur", "sous-marin", "torpilleur");
    static final List<String> THEMES = List.of("ocean", "cartoon", "pirate", "space");
    private static final List<String> ACTIVE = List.of(NavalGame.PLACING, NavalGame.PLAYING);
    private static final String URL = "/jeux/bataille";
    private static final Object LOCK = new Object();
    private static final TypeReference<List<List<Integer>>> FLEET = new TypeReference<>() {
    };
    private static final TypeReference<List<Integer>> SHOTS = new TypeReference<>() {
    };

    private final NavalGameRepository games;
    private final UserRepository users;
    private final ApplicationEventPublisher events;
    private final ObjectMapper json;
    private final Clock clock;

    @Autowired
    public NavalService(NavalGameRepository games, UserRepository users, ApplicationEventPublisher events, ObjectMapper json) {
        this(games, users, events, json, Clock.systemUTC());
    }

    NavalService(NavalGameRepository games, UserRepository users, ApplicationEventPublisher events, ObjectMapper json, Clock clock) {
        this.games = games;
        this.users = users;
        this.events = events;
        this.json = json;
        this.clock = clock;
    }

    /** The game going on, else the last one; empty if we never played. */
    @Transactional(readOnly = true)
    public Optional<NavalDtos.View> current(String username) {
        User me = user(username);
        return games.findByStatusIn(ACTIVE).stream().filter(g -> g.isPlayer(me.getId())).findFirst()
                .or(() -> games.findTopByOrderByIdDesc().filter(g -> g.isPlayer(me.getId())))
                .map(g -> view(g, me));
    }

    /** A new game against the other one (one at a time); its theme is the last winner's pick. */
    @Transactional
    public NavalDtos.View create(String username, NavalDtos.Create request) {
        synchronized (LOCK) {
            User me = user(username);
            User other = users.findAll().stream().filter(u -> !u.getId().equals(me.getId())).findFirst()
                    .orElseThrow(() -> new ConflictException("Personne avec qui jouer pour l'instant"));
            if (!games.findByStatusIn(ACTIVE).isEmpty()) {
                throw new ConflictException("Une bataille est déjà en cours");
            }
            String theme = games.findTopByOrderByIdDesc()
                    .map(last -> last.getNextTheme() != null ? last.getNextTheme() : last.getTheme())
                    .orElseGet(() -> theme(request == null ? null : request.theme()));
            NavalGame g = games.save(new NavalGame(me, other, theme, clock.instant()));
            changed(g);
            notice(other, me.getDisplayName() + " lance une bataille navale 🚢 Place ta flotte !", g);
            return view(g, me);
        }
    }

    /** My fleet, once and for all; when both are placed, a coin toss says who shoots first. */
    @Transactional
    public NavalDtos.View place(String username, long id, NavalDtos.Fleet request) {
        synchronized (LOCK) {
            User me = user(username);
            NavalGame g = mine(me, id);
            boolean host = g.isHost(me.getId());
            if (!NavalGame.PLACING.equals(g.getStatus()) || g.fleetOf(host) != null) {
                throw new ConflictException("Ta flotte est déjà placée");
            }
            Instant now = clock.instant();
            g.placeFleet(host, write(fleet(request)), now);
            if (g.fleetOf(!host) != null) {
                User first = ThreadLocalRandom.current().nextBoolean() ? g.getHost() : g.getGuest();
                g.start(first, now);
                notice(first, "Les deux flottes sont prêtes : à toi de tirer ⚓", g);
            }
            changed(g);
            return view(g, me);
        }
    }

    /** One shot at the other's sea, on my turn; the turn passes whatever it hit. */
    @Transactional
    public NavalDtos.View shoot(String username, long id, NavalDtos.Shoot request) {
        synchronized (LOCK) {
            User me = user(username);
            NavalGame g = mine(me, id);
            if (!NavalGame.PLAYING.equals(g.getStatus()) || g.getTurn() == null || !g.getTurn().getId().equals(me.getId())) {
                throw new ConflictException("Ce n'est pas ton tour");
            }
            int cell = request == null ? -1 : request.cell();
            if (cell < 0 || cell >= SIZE * SIZE) {
                throw new ContentValidationException("Case invalide");
            }
            boolean host = g.isHost(me.getId());
            List<Integer> shots = new ArrayList<>(read(g.shotsOf(host), SHOTS));
            if (shots.contains(cell)) {
                throw new ConflictException("Déjà visé ici");
            }
            shots.add(cell);
            List<List<Integer>> target = read(g.fleetOf(!host), FLEET);
            User other = host ? g.getGuest() : g.getHost();
            Instant now = clock.instant();
            g.shot(host, write(shots), other, now);
            Integer sunk = sunkBy(target, shots, cell);
            boolean hit = target.stream().anyMatch(s -> s.contains(cell));
            if (target.stream().allMatch(s -> shots.containsAll(s))) {
                g.end(me, "sunk", now);
                notice(other, me.getDisplayName() + " a coulé toute ta flotte 🏳️ Revanche ?", g);
            } else {
                String what = sunk != null ? "et coulé ton " + NAMES.get(sunk) + " 💥" : hit ? "et touché 💥" : "dans l'eau 💦";
                notice(other, me.getDisplayName() + " a tiré " + what + " — à toi ⚓", g);
            }
            changed(g);
            return view(g, me);
        }
    }

    /** Stopping a game: nobody wins it, the theme stays. */
    @Transactional
    public NavalDtos.View quit(String username, long id) {
        synchronized (LOCK) {
            User me = user(username);
            NavalGame g = mine(me, id);
            if (!g.isActive()) {
                throw new ConflictException("La partie est déjà finie");
            }
            g.end(null, "abandon", clock.instant());
            changed(g);
            notice(g.isHost(me.getId()) ? g.getGuest() : g.getHost(), me.getDisplayName() + " a abandonné la bataille navale", g);
            return view(g, me);
        }
    }

    /** The winner of the last game picks the next one's theme (for both of us). */
    @Transactional
    public NavalDtos.View chooseTheme(String username, long id, NavalDtos.Theme request) {
        synchronized (LOCK) {
            User me = user(username);
            NavalGame g = mine(me, id);
            boolean latest = games.findTopByOrderByIdDesc().map(last -> last.getId().equals(g.getId())).orElse(false);
            if (!NavalGame.DONE.equals(g.getStatus()) || g.getWinner() == null || !g.getWinner().getId().equals(me.getId()) || !latest) {
                throw new ConflictException("Seul·e le ou la gagnant·e de la dernière partie choisit le thème");
            }
            g.chooseNextTheme(theme(request == null ? null : request.theme()), clock.instant());
            changed(g);
            return view(g, me);
        }
    }

    /** For the broadcast: what changed, without any ship. */
    NavalDtos.Ping ping(NavalGame g) {
        List<Integer> hs = read(g.shotsOf(true), SHOTS);
        List<Integer> gs = read(g.shotsOf(false), SHOTS);
        NavalDtos.LastShot last = last(g, hs, gs);
        return new NavalDtos.Ping(g.getId(), g.getStatus(), id(g.getTurn()), id(g.getWinner()), g.getHost().getId(),
                g.getHost().getDisplayName(), g.getGuest().getId(), g.getGuest().getDisplayName(), hs.size() + gs.size(),
                last != null && last.hit());
    }

    NavalDtos.View view(NavalGame g, User me) {
        boolean host = g.isHost(me.getId());
        User other = host ? g.getGuest() : g.getHost();
        List<List<Integer>> myFleet = readFleet(g.fleetOf(host));
        List<List<Integer>> theirFleet = readFleet(g.fleetOf(!host));
        List<Integer> myShots = read(g.shotsOf(host), SHOTS);
        List<Integer> theirShots = read(g.shotsOf(!host), SHOTS);
        boolean over = NavalGame.DONE.equals(g.getStatus());

        List<NavalDtos.ShipView> mine = ships(myFleet, theirShots, false);
        List<NavalDtos.ShipView> theirs = ships(theirFleet, myShots, !over); // unsunk ones only once over
        List<Integer> hs = host ? myShots : theirShots;
        List<Integer> gs = host ? theirShots : myShots;
        return new NavalDtos.View(g.getId(), g.getTheme(), g.getNextTheme() != null ? g.getNextTheme() : g.getTheme(),
                g.getStatus(), g.getHost().getId(), g.getHost().getDisplayName(), g.getGuest().getId(),
                g.getGuest().getDisplayName(), me.getId(), id(g.getTurn()), id(g.getWinner()), g.getEndedReason(),
                !myFleet.isEmpty(), !theirFleet.isEmpty(), mine, theirs, shots(myShots, theirFleet), shots(theirShots, myFleet),
                myShots.size() + theirShots.size(), last(g, hs, gs), games.countByWinnerId(me.getId()),
                games.countByWinnerId(other.getId()));
    }

    /** Checks and lays out a fleet: 5 ships of the right lengths, inside the sea, not overlapping. */
    static List<List<Integer>> fleet(NavalDtos.Fleet request) {
        List<NavalDtos.Ship> ships = request == null || request.ships() == null ? List.of() : request.ships();
        if (ships.size() != LENGTHS.size()) {
            throw new ContentValidationException("Il faut placer les 5 bateaux");
        }
        Set<Integer> taken = new HashSet<>();
        List<List<Integer>> out = new ArrayList<>();
        for (int i = 0; i < ships.size(); i++) {
            NavalDtos.Ship s = ships.get(i);
            if (s == null || s.cell() < 0 || s.cell() >= SIZE * SIZE) {
                throw new ContentValidationException("Bateau hors de la mer");
            }
            int row = s.cell() / SIZE;
            int col = s.cell() % SIZE;
            int len = LENGTHS.get(i);
            if ((s.vertical() ? row : col) + len > SIZE) {
                throw new ContentValidationException("Bateau hors de la mer");
            }
            List<Integer> cells = new ArrayList<>();
            for (int k = 0; k < len; k++) {
                int c = s.vertical() ? s.cell() + k * SIZE : s.cell() + k;
                if (!taken.add(c)) {
                    throw new ContentValidationException("Deux bateaux se chevauchent");
                }
                cells.add(c);
            }
            out.add(cells);
        }
        return out;
    }

    /** The ship type this shot has just sunk, if it did. */
    private static Integer sunkBy(List<List<Integer>> fleet, List<Integer> shots, int cell) {
        for (int i = 0; i < fleet.size(); i++) {
            if (fleet.get(i).contains(cell) && shots.containsAll(fleet.get(i))) {
                return i;
            }
        }
        return null;
    }

    /** The latest shot: by whoever doesn't have the turn now (or the winner, who fired the last one). */
    private NavalDtos.LastShot last(NavalGame g, List<Integer> hostShots, List<Integer> guestShots) {
        User by = NavalGame.PLAYING.equals(g.getStatus()) ? (g.getTurn() == null ? null : g.isHost(g.getTurn().getId()) ? g.getGuest() : g.getHost())
                : "sunk".equals(g.getEndedReason()) ? g.getWinner() : null;
        if (by == null) {
            return null;
        }
        boolean host = g.isHost(by.getId());
        List<Integer> shots = host ? hostShots : guestShots;
        if (shots.isEmpty()) {
            return null;
        }
        int cell = shots.get(shots.size() - 1);
        List<List<Integer>> target = readFleet(g.fleetOf(!host));
        return new NavalDtos.LastShot(by.getId(), cell, target.stream().anyMatch(s -> s.contains(cell)), sunkBy(target, shots, cell));
    }

    /** Ships with whether they're sunk; {@code sunkOnly} leaves out the ones still afloat. */
    private static List<NavalDtos.ShipView> ships(List<List<Integer>> fleet, List<Integer> shots, boolean sunkOnly) {
        List<NavalDtos.ShipView> out = new ArrayList<>();
        for (int i = 0; i < fleet.size(); i++) {
            boolean sunk = shots.containsAll(fleet.get(i));
            if (sunk || !sunkOnly) {
                out.add(new NavalDtos.ShipView(i, fleet.get(i), sunk));
            }
        }
        return out;
    }

    private static List<NavalDtos.Shot> shots(List<Integer> shots, List<List<Integer>> target) {
        return shots.stream().map(c -> new NavalDtos.Shot(c, target.stream().anyMatch(s -> s.contains(c)))).toList();
    }

    private static String theme(String theme) {
        if (theme == null || theme.isBlank()) {
            return THEMES.get(0);
        }
        if (!THEMES.contains(theme)) {
            throw new ContentValidationException("Thème inconnu");
        }
        return theme;
    }

    private static Long id(User u) {
        return u == null ? null : u.getId();
    }

    private void changed(NavalGame g) {
        events.publishEvent(new NavalEvents(g.getId()));
    }

    private void notice(User to, String body, NavalGame g) {
        events.publishEvent(new LiveEvents.Notice(to.getId(), body, URL, "naval-" + g.getId()));
    }

    private NavalGame mine(User me, long id) {
        return games.findById(id).filter(g -> g.isPlayer(me.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Partie introuvable"));
    }

    private List<List<Integer>> readFleet(String value) {
        return value == null ? List.of() : read(value, FLEET);
    }

    private <T> T read(String value, TypeReference<T> type) {
        try {
            return json.readValue(value, type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unreadable naval game", e);
        }
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unwritable naval game", e);
        }
    }

    private User user(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
