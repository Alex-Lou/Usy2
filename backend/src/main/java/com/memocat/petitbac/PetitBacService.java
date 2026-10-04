package com.memocat.petitbac;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.CoupleActivity;
import com.memocat.domain.PetitBacEntry;
import com.memocat.domain.PetitBacGame;
import com.memocat.domain.PetitBacRound;
import com.memocat.domain.User;
import com.memocat.petitbac.PetitBacDtos.GameDto;
import com.memocat.petitbac.PetitBacDtos.RoundDto;
import com.memocat.petitbac.PetitBacDtos.SummaryDto;
import com.memocat.repository.PetitBacEntryRepository;
import com.memocat.repository.PetitBacGameRepository;
import com.memocat.repository.PetitBacRoundRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ForbiddenException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 🎲 Petit Bac between the two of us. The server keeps the clock: the letter is told only once a
 * round starts for a player, answers are saved as they are typed and refused after the end, and
 * the other's answers show only when both sheets are in. Rounds end by themselves when their time
 * is up (worked out when read, no scheduler).
 */
@Service
public class PetitBacService {

    static final String DIRECT = "direct";
    static final String OWN_PACE = "rythme";
    static final int LIST_SIZE = 30;

    private static final TypeReference<List<String>> STRINGS = new TypeReference<>() {
    };
    private static final TypeReference<List<Integer>> NUMBERS = new TypeReference<>() {
    };

    private final PetitBacGameRepository games;
    private final PetitBacRoundRepository rounds;
    private final PetitBacEntryRepository entries;
    private final UserRepository users;
    private final ObjectMapper json;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final Random random;

    @Autowired
    public PetitBacService(PetitBacGameRepository games, PetitBacRoundRepository rounds, PetitBacEntryRepository entries,
                           UserRepository users, ObjectMapper json, ApplicationEventPublisher events) {
        this(games, rounds, entries, users, json, events, Clock.systemUTC(), new Random());
    }

    PetitBacService(PetitBacGameRepository games, PetitBacRoundRepository rounds, PetitBacEntryRepository entries,
                    UserRepository users, ObjectMapper json, ApplicationEventPublisher events, Clock clock, Random random) {
        this.games = games;
        this.rounds = rounds;
        this.entries = entries;
        this.users = users;
        this.json = json;
        this.events = events;
        this.clock = clock;
        this.random = random;
    }

    // ---- Reading -----------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<SummaryDto> list(String username) {
        User me = requireUser(username);
        List<PetitBacGame> mine = games.findVisibleTo(me.getId(), PageRequest.of(0, LIST_SIZE));
        if (mine.isEmpty()) return List.of();
        Map<Long, List<PetitBacRound>> byGame = rounds.findByGameIdIn(mine.stream().map(PetitBacGame::getId).toList())
                .stream().collect(Collectors.groupingBy(r -> r.getGame().getId()));
        List<Long> roundIds = byGame.values().stream().flatMap(List::stream).map(PetitBacRound::getId).toList();
        Map<Long, List<PetitBacEntry>> sheets = roundIds.isEmpty() ? Map.of()
                : entries.findByRoundIdIn(roundIds).stream().collect(Collectors.groupingBy(e -> e.getRound().getId()));
        Instant now = clock.instant();
        List<SummaryDto> out = new ArrayList<>();
        for (PetitBacGame g : mine) {
            List<PetitBacRound> rs = new ArrayList<>(byGame.getOrDefault(g.getId(), List.of()));
            rs.sort((a, b) -> Integer.compare(a.getNumber(), b.getNumber()));
            int myTotal = 0;
            int theirTotal = 0;
            String status = "fini";
            for (PetitBacRound r : rs) {
                Sheet s = sheet(g, r, me, sheets.getOrDefault(r.getId(), List.of()));
                myTotal += s.me.getScore() == null ? 0 : s.me.getScore();
                theirTotal += s.them.getScore() == null ? 0 : s.them.getScore();
                status = status(phase(g, r, s, now), s);
            }
            out.add(new SummaryDto(g.getId(), g.getMode(), categoriesOf(g).size(), g.getOwner().getId().equals(me.getId()),
                    other(g, me).getDisplayName(), rs.size(), myTotal, theirTotal, status, g.getUpdatedAt()));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public GameDto get(String username, Long id) {
        User me = requireUser(username);
        return toDto(visible(id, me), me);
    }

    // ---- Playing -----------------------------------------------------------------------------

    @Transactional
    public GameDto create(String username, String mode, List<String> categories) {
        User me = requireUser(username);
        User partner = users.findAll().stream().filter(u -> !u.getId().equals(me.getId())).findFirst()
                .orElseThrow(() -> new ConflictException("Personne avec qui jouer pour l'instant"));
        String m = parseMode(mode);
        List<String> cats;
        try {
            cats = PetitBacRules.categories(categories);
        } catch (IllegalArgumentException e) {
            throw new ContentValidationException(e.getMessage());
        }
        Instant now = clock.instant();
        PetitBacGame game = games.save(new PetitBacGame(me, partner, m, toJson(cats), now));
        PetitBacRound round = newRound(game, 1, Set.of(), now);
        events.publishEvent(CoupleActivity.of(CoupleActivity.PETIT_BAC, me, invitation(game, round), game.getId()));
        return toDto(game, me);
    }

    /** The next round (once the last one is counted), with a letter not played yet. */
    @Transactional
    public GameDto nextRound(String username, Long id) {
        User me = requireUser(username);
        PetitBacGame game = visible(id, me);
        List<PetitBacRound> rs = rounds.findByGameIdOrderByNumber(id);
        PetitBacRound last = rs.get(rs.size() - 1);
        if (last.getFinishedAt() == null) throw new ConflictException("Finissez d'abord cette manche");
        Instant now = clock.instant();
        Set<String> used = rs.stream().map(PetitBacRound::getLetter).collect(Collectors.toSet());
        PetitBacRound round = newRound(game, last.getNumber() + 1, used, now);
        game.touch(now);
        events.publishEvent(CoupleActivity.of(CoupleActivity.PETIT_BAC, me, invitation(game, round), game.getId()));
        return toDto(game, me);
    }

    /** Direct: I'm ready (the round starts when both are). At one's own pace: my clock starts now. */
    @Transactional
    public GameDto ready(String username, Long id, int number) {
        User me = requireUser(username);
        PetitBacGame game = visible(id, me);
        PetitBacRound round = lockRound(id, number);
        Sheet s = sheet(game, round, me, entries.findByRoundId(round.getId()));
        Instant now = clock.instant();
        if (!"pret".equals(phase(game, round, s, now))) return toDto(game, me);
        if (DIRECT.equals(game.getMode())) {
            s.me.ready();
            if (s.them.isReady()) round.start(now);
        } else {
            s.me.start(now);
        }
        game.touch(now);
        return toDto(game, me);
    }

    /** My answers so far (saved as I type): accepted until my time is up. */
    @Transactional
    public GameDto answers(String username, Long id, int number, List<String> answers) {
        User me = requireUser(username);
        PetitBacGame game = visible(id, me);
        PetitBacRound round = lockRound(id, number);
        Sheet s = sheet(game, round, me, entries.findByRoundId(round.getId()));
        write(game, round, s, answers, clock.instant());
        return toDto(game, me);
    }

    /** « Stop ! » (direct: the other has 10 s left) or « J'ai fini » (at one's own pace), with my last answers. */
    @Transactional
    public GameDto done(String username, Long id, int number, List<String> answers) {
        User me = requireUser(username);
        PetitBacGame game = visible(id, me);
        PetitBacRound round = lockRound(id, number);
        Sheet s = sheet(game, round, me, entries.findByRoundId(round.getId()));
        Instant now = clock.instant();
        if (s.me.getDoneAt() != null) return toDto(game, me);
        if (deadline(game, round, s.me) == null) throw new ConflictException("Cette manche n'a pas commencé");
        // Too late for these answers (the network): the sheet is handed in with what was saved.
        if (answers != null && writable(game, round, s.me, now)) write(game, round, s, answers, now);
        boolean wasWaiting = played(game, round, s.them, now);
        s.me.done(now);
        if (DIRECT.equals(game.getMode())) round.stop(me.getId(), now);
        game.touch(now);
        // My sheet was the last one in: the other can check my answers.
        if (wasWaiting) {
            events.publishEvent(CoupleActivity.of(CoupleActivity.PETIT_BAC_REVIEW, me, "Lettre " + round.getLetter(), game.getId()));
        }
        return toDto(game, me);
    }

    /** The other's answers I refuse; once both have validated, the points are counted. */
    @Transactional
    public GameDto review(String username, Long id, int number, List<Integer> refused, boolean validate) {
        User me = requireUser(username);
        PetitBacGame game = visible(id, me);
        PetitBacRound round = lockRound(id, number);
        Sheet s = sheet(game, round, me, entries.findByRoundId(round.getId()));
        Instant now = clock.instant();
        if (!"validation".equals(phase(game, round, s, now))) throw new ConflictException("Rien à valider pour l'instant");
        if (s.me.getValidatedAt() != null) throw new ConflictException("Tu as déjà validé cette manche");
        List<String> theirs = fromJson(s.them.getAnswers(), STRINGS);
        Set<Integer> picked = new HashSet<>(refused == null ? List.of() : refused);
        for (int i : picked) {
            if (i < 0 || i >= theirs.size() || !PetitBacRules.onLetter(theirs.get(i), round.getLetter())) {
                throw new ContentValidationException("Cette réponse ne peut pas être refusée");
            }
        }
        List<Integer> sorted = new ArrayList<>(picked);
        Collections.sort(sorted);
        s.me.review(toJson(sorted));
        if (validate) {
            s.me.validate(now);
            if (s.them.getValidatedAt() != null) {
                count(game, round, s);
                round.finish(now);
                events.publishEvent(CoupleActivity.of(CoupleActivity.PETIT_BAC_DONE, me, "Lettre " + round.getLetter(), game.getId()));
            }
        }
        game.touch(now);
        return toDto(game, me);
    }

    @Transactional
    public void delete(String username, Long id) {
        User me = requireUser(username);
        PetitBacGame game = visible(id, me);
        if (!game.getOwner().getId().equals(me.getId())) {
            throw new ForbiddenException("Seul celui qui a lancé la partie peut la supprimer");
        }
        games.delete(game);
    }

    // ---- Rules of a round ----------------------------------------------------------------------

    /** Both sheets of a round, mine first. */
    record Sheet(PetitBacEntry me, PetitBacEntry them) {
    }

    private Sheet sheet(PetitBacGame g, PetitBacRound r, User me, List<PetitBacEntry> both) {
        PetitBacEntry mine = null;
        PetitBacEntry theirs = null;
        for (PetitBacEntry e : both) {
            if (e.getPlayerId().equals(me.getId())) mine = e;
            else theirs = e;
        }
        if (mine == null || theirs == null) throw new IllegalStateException("Round " + r.getId() + " without both sheets");
        return new Sheet(mine, theirs);
    }

    /** When a player's writing time ends (null: not started). */
    Instant deadline(PetitBacGame g, PetitBacRound r, PetitBacEntry e) {
        if (DIRECT.equals(g.getMode())) {
            if (r.getStartedAt() == null) return null;
            Instant max = r.getStartedAt().plus(PetitBacRules.DIRECT_MAX);
            if (r.getStopAt() == null) return max;
            Instant afterStop = r.getStopAt().plus(PetitBacRules.AFTER_STOP);
            return afterStop.isBefore(max) ? afterStop : max;
        }
        return e.getStartedAt() == null ? null : e.getStartedAt().plus(PetitBacRules.OWN_PACE);
    }

    /** This sheet is in: handed in, or its time is up. */
    boolean played(PetitBacGame g, PetitBacRound r, PetitBacEntry e, Instant now) {
        if (e.getDoneAt() != null) return true;
        Instant end = deadline(g, r, e);
        return end != null && !now.isBefore(end);
    }

    String phase(PetitBacGame g, PetitBacRound r, Sheet s, Instant now) {
        if (r.getFinishedAt() != null) return "fini";
        boolean mine = played(g, r, s.me, now);
        if (mine && played(g, r, s.them, now)) return "validation";
        if (mine) return "attente";
        boolean started = DIRECT.equals(g.getMode()) ? r.getStartedAt() != null : s.me.getStartedAt() != null;
        return started ? "jeu" : "pret";
    }

    private static String status(String phase, Sheet s) {
        return switch (phase) {
            case "pret", "jeu" -> "a-toi";
            case "validation" -> s.me.getValidatedAt() == null ? "a-valider" : "attente-validation";
            default -> phase;
        };
    }

    /** Still time to write (a few seconds of grace for the network). */
    private boolean writable(PetitBacGame g, PetitBacRound r, PetitBacEntry e, Instant now) {
        Instant end = deadline(g, r, e);
        return e.getDoneAt() == null && end != null && now.isBefore(end.plus(PetitBacRules.NETWORK_GRACE));
    }

    private void write(PetitBacGame g, PetitBacRound r, Sheet s, List<String> answers, Instant now) {
        if (!writable(g, r, s.me, now)) throw new ConflictException("Temps écoulé");
        int size = categoriesOf(g).size();
        if (answers == null || answers.size() != size) throw new ContentValidationException("Une réponse par catégorie");
        s.me.write(toJson(answers.stream().map(PetitBacRules::clean).toList()));
    }

    private void count(PetitBacGame g, PetitBacRound r, Sheet s) {
        List<String> mine = fromJson(s.me.getAnswers(), STRINGS);
        List<String> theirs = fromJson(s.them.getAnswers(), STRINGS);
        Set<Integer> iRefused = new HashSet<>(fromJson(s.me.getRejected(), NUMBERS));
        Set<Integer> theyRefused = new HashSet<>(fromJson(s.them.getRejected(), NUMBERS));
        s.me.score(sum(PetitBacRules.points(mine, theirs, theyRefused, iRefused, r.getLetter())));
        s.them.score(sum(PetitBacRules.points(theirs, mine, iRefused, theyRefused, r.getLetter())));
    }

    private static int sum(List<Integer> points) {
        return points.stream().mapToInt(Integer::intValue).sum();
    }

    private PetitBacRound newRound(PetitBacGame game, int number, Set<String> used, Instant now) {
        PetitBacRound round = rounds.save(new PetitBacRound(game, number, PetitBacRules.draw(used, random), now));
        String empty = toJson(Collections.nCopies(categoriesOf(game).size(), ""));
        entries.save(new PetitBacEntry(round, game.getOwner().getId(), empty));
        entries.save(new PetitBacEntry(round, game.getPartner().getId(), empty));
        return round;
    }

    private static String invitation(PetitBacGame g, PetitBacRound r) {
        return "Manche " + r.getNumber() + (DIRECT.equals(g.getMode())
                ? " en direct : rejoins la partie !"
                : " à ton rythme : 3 min chrono, quand tu veux");
    }

    // ---- To the app ----------------------------------------------------------------------------

    private GameDto toDto(PetitBacGame g, User me) {
        List<PetitBacRound> rs = rounds.findByGameIdOrderByNumber(g.getId());
        Map<Long, List<PetitBacEntry>> sheets = rs.isEmpty() ? Map.of()
                : entries.findByRoundIdIn(rs.stream().map(PetitBacRound::getId).toList()).stream()
                .collect(Collectors.groupingBy(e -> e.getRound().getId()));
        Instant now = clock.instant();
        List<RoundDto> out = new ArrayList<>();
        int myTotal = 0;
        int theirTotal = 0;
        for (PetitBacRound r : rs) {
            Sheet s = sheet(g, r, me, sheets.getOrDefault(r.getId(), List.of()));
            RoundDto dto = round(g, r, s, me, now);
            out.add(dto);
            if (dto.myScore() != null) myTotal += dto.myScore();
            if (dto.theirScore() != null) theirTotal += dto.theirScore();
        }
        return new GameDto(g.getId(), g.getMode(), categoriesOf(g), g.getOwner().getId().equals(me.getId()),
                g.getOwner().getDisplayName(), other(g, me).getDisplayName(), myTotal, theirTotal, now, out,
                g.getCreatedAt(), g.getUpdatedAt());
    }

    private RoundDto round(PetitBacGame g, PetitBacRound r, Sheet s, User me, Instant now) {
        String phase = phase(g, r, s, now);
        boolean open = phase.equals("validation") || phase.equals("fini");
        boolean done = phase.equals("fini");
        String letter = phase.equals("pret") ? null : r.getLetter();
        List<String> mine = fromJson(s.me.getAnswers(), STRINGS);
        List<String> theirs = fromJson(s.them.getAnswers(), STRINGS);
        List<Integer> iRefused = fromJson(s.me.getRejected(), NUMBERS);
        List<Integer> theyRefused = fromJson(s.them.getRejected(), NUMBERS);
        List<Integer> myPoints = null;
        List<Integer> theirPoints = null;
        if (done) {
            myPoints = PetitBacRules.points(mine, theirs, new HashSet<>(theyRefused), new HashSet<>(iRefused), r.getLetter());
            theirPoints = PetitBacRules.points(theirs, mine, new HashSet<>(iRefused), new HashSet<>(theyRefused), r.getLetter());
        }
        boolean themStarted = DIRECT.equals(g.getMode()) ? r.getStartedAt() != null : s.them.getStartedAt() != null;
        // While writing: my end. While waiting: theirs (« Sam a encore 8 s »).
        Instant end = phase.equals("jeu") ? deadline(g, r, s.me) : phase.equals("attente") ? deadline(g, r, s.them) : null;
        return new RoundDto(r.getNumber(), letter, phase, end,
                s.me.isReady(), s.them.isReady(), themStarted, (int) theirs.stream().filter(a -> !a.isBlank()).count(),
                me.getId().equals(r.getStoppedBy()), r.getStoppedBy() != null && !me.getId().equals(r.getStoppedBy()),
                mine, open ? theirs : null,
                open ? onLetter(mine, r.getLetter()) : null, open ? onLetter(theirs, r.getLetter()) : null,
                iRefused, done ? theyRefused : null, s.me.getValidatedAt() != null, s.them.getValidatedAt() != null,
                myPoints, theirPoints, done ? s.me.getScore() : null, done ? s.them.getScore() : null);
    }

    private static List<Boolean> onLetter(List<String> answers, String letter) {
        return answers.stream().map(a -> PetitBacRules.onLetter(a, letter)).toList();
    }

    // ---- Plumbing ------------------------------------------------------------------------------

    static String parseMode(String raw) {
        String m = raw == null || raw.isBlank() ? DIRECT : raw.strip().toLowerCase(Locale.ROOT);
        if (!m.equals(DIRECT) && !m.equals(OWN_PACE)) throw new ContentValidationException("Mode inconnu");
        return m;
    }

    private PetitBacGame visible(Long id, User me) {
        PetitBacGame g = games.findById(id).orElseThrow(() -> new ResourceNotFoundException("Partie introuvable"));
        if (!g.getOwner().getId().equals(me.getId()) && !g.getPartner().getId().equals(me.getId())) {
            throw new ResourceNotFoundException("Partie introuvable");
        }
        return g;
    }

    private PetitBacRound lockRound(Long gameId, int number) {
        return rounds.findForUpdate(gameId, number).orElseThrow(() -> new ResourceNotFoundException("Manche introuvable"));
    }

    private static User other(PetitBacGame g, User me) {
        return g.getOwner().getId().equals(me.getId()) ? g.getPartner() : g.getOwner();
    }

    private List<String> categoriesOf(PetitBacGame g) {
        return fromJson(g.getCategories(), STRINGS);
    }

    private String toJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private <T> T fromJson(String value, TypeReference<T> type) {
        try {
            return json.readValue(value, type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private User requireUser(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
