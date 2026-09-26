package com.memocat.live;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.domain.LiveGame;
import com.memocat.domain.User;
import com.memocat.nous.NousBank;
import com.memocat.quiz.QuizService;
import com.memocat.repository.LiveGameRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * ⚡ Live games: both of us get the same question at the same moment, on a
 * clock kept by the server. When both have answered, the answers are revealed
 * together for a few seconds, then the next question comes. If the time runs
 * out and someone hasn't answered, the game pauses (nothing is lost): the one
 * missing is told, and picks it up again when back (the question starts over
 * with a fresh clock, answers already given kept). A pause lasts 24 h at most,
 * then the game ends with the scores so far.
 *
 * <p>Quiz duel: 10 questions (a level or the mix), one option, points for the
 * right one plus a speed bonus. "Même longueur d'onde" (Nous deux): 8 choice
 * questions each answers for themself, both get the share of ticks in common.
 */
@Service
public class LiveService {

    public static final String QUIZ = "quiz";
    public static final String NOUS = "nous";
    static final int QUIZ_SECONDS = 20;
    static final int NOUS_SECONDS = 30;
    static final int NOUS_ROUNDS = 8;
    static final Duration REVEAL = Duration.ofSeconds(4);
    static final Duration GRACE = Duration.ofSeconds(2);
    static final Duration PAUSE_MAX = Duration.ofHours(24);
    static final Duration INVITE_MAX = Duration.ofHours(24);
    static final Duration NUDGE_EVERY = Duration.ofMinutes(1);
    private static final List<String> ACTIVE = List.of(LiveGame.INVITED, LiveGame.PLAYING, LiveGame.PAUSED);
    private static final Object LOCK = new Object();

    /** A question as stored: {@code c} the right option (quiz), -1 for Nous deux. */
    public record Item(String t, List<String> o, int c) {
    }

    /** One question's answers ({@code h} host, {@code g} guest: option bit sets, null = none yet) and points. */
    public record Slot(Integer h, Integer g, int hp, int gp) {
        Slot with(boolean host, int answer, int points) {
            return host ? new Slot(answer, g, points, gp) : new Slot(h, answer, hp, points);
        }
    }

    private final LiveGameRepository games;
    private final UserRepository users;
    private final QuizService quiz;
    private final NousBank nous;
    private final ApplicationEventPublisher events;
    private final ObjectMapper json;
    private final Clock clock;
    private final Map<Long, Instant> lastNudge = new ConcurrentHashMap<>();

    @Autowired
    public LiveService(LiveGameRepository games, UserRepository users, QuizService quiz, NousBank nous,
                       ApplicationEventPublisher events, ObjectMapper json) {
        this(games, users, quiz, nous, events, json, Clock.systemUTC());
    }

    LiveService(LiveGameRepository games, UserRepository users, QuizService quiz, NousBank nous,
                ApplicationEventPublisher events, ObjectMapper json, Clock clock) {
        this.games = games;
        this.users = users;
        this.quiz = quiz;
        this.nous = nous;
        this.events = events;
        this.json = json;
        this.clock = clock;
    }

    /** The game going on (invited, playing or paused), else the last one. */
    @Transactional(readOnly = true)
    public Optional<LiveDtos.View> current(String username) {
        User me = user(username);
        List<LiveGame> active = games.findByStatusIn(ACTIVE);
        Optional<LiveGame> game = active.stream().filter(g -> g.isPlayer(me.getId())).findFirst()
                .or(() -> games.findTop10ByOrderByIdDesc().stream().filter(g -> g.isPlayer(me.getId())).findFirst());
        return game.map(this::view);
    }

    @Transactional(readOnly = true)
    public LiveDtos.View get(String username, long id) {
        return view(mine(user(username), id));
    }

    /** Invites the other one; one live game at a time. */
    @Transactional
    public LiveDtos.View create(String username, LiveDtos.Create request) {
        synchronized (LOCK) {
            User me = user(username);
            User other = users.findAll().stream().filter(u -> !u.getId().equals(me.getId())).findFirst()
                    .orElseThrow(() -> new ConflictException("Personne avec qui jouer pour l'instant"));
            if (!games.findByStatusIn(ACTIVE).isEmpty()) {
                throw new ConflictException("Une partie en direct est déjà en cours");
            }
            String kind = request == null ? null : request.kind();
            List<Item> items;
            String label;
            int seconds;
            if (QUIZ.equals(kind)) {
                boolean mix = "mix".equals(request.theme());
                int level = mix ? 0 : request.level() == null ? 0 : request.level();
                items = (mix ? quiz.mixItems(3) : quiz.levelItems(me, request.theme(), level)).stream()
                        .map(i -> new Item(i.text(), i.options(), i.correct())).toList();
                label = mix ? "🎲 Mélange surprise" : com.memocat.quiz.QuizBank.theme(request.theme())
                        .map(t -> t.emoji() + " " + t.label() + " · niveau " + level).orElse("Quiz");
                seconds = QUIZ_SECONDS;
            } else if (NOUS.equals(kind)) {
                String theme = request.theme() == null || request.theme().isBlank() ? null : request.theme();
                if (theme != null && NousBank.theme(theme).isEmpty()) {
                    throw new ContentValidationException("Thème inconnu");
                }
                List<NousBank.Question> pool = new ArrayList<>(nous.all().stream()
                        .filter(q -> NousBank.CHOICE.equals(q.kind()) && (theme == null || q.theme().equals(theme))).toList());
                Collections.shuffle(pool, ThreadLocalRandom.current());
                items = pool.stream().limit(NOUS_ROUNDS).map(q -> new Item(q.text(), q.options(), -1)).toList();
                label = theme == null ? "💞 Même longueur d'onde" : NousBank.theme(theme).map(t -> "💞 " + t.emoji() + " " + t.label()).orElse("");
                seconds = NOUS_SECONDS;
            } else {
                throw new ContentValidationException("Jeu inconnu");
            }
            if (items.isEmpty()) {
                throw new ConflictException("Pas de questions ici pour l'instant");
            }
            LiveGame fresh = new LiveGame(kind, label, me, other, write(items), seconds, clock.instant());
            fresh.setAnswers(write(items.stream().map(i -> new Slot(null, null, 0, 0)).toList()));
            LiveGame g = games.save(fresh);
            changed(g);
            notice(other, me.getDisplayName() + " te propose une partie en direct ⚡ " + label, g);
            return view(g);
        }
    }

    @Transactional
    public LiveDtos.View accept(String username, long id) {
        synchronized (LOCK) {
            User me = user(username);
            LiveGame g = mine(me, id);
            if (!LiveGame.INVITED.equals(g.getStatus()) || !g.getGuest().getId().equals(me.getId())) {
                throw new ConflictException("Cette invitation n'est plus valable");
            }
            Instant now = clock.instant();
            g.ask(0, now.plusSeconds(g.getSeconds()), now);
            changed(g);
            return view(g);
        }
    }

    /** Declining (the one invited) or taking back (the one inviting) an invitation. */
    @Transactional
    public LiveDtos.View decline(String username, long id) {
        synchronized (LOCK) {
            LiveGame g = mine(user(username), id);
            if (!LiveGame.INVITED.equals(g.getStatus())) {
                throw new ConflictException("Cette invitation n'est plus valable");
            }
            g.end(LiveGame.CANCELLED, "declined", clock.instant());
            changed(g);
            return view(g);
        }
    }

    /** One answer: option indexes (one for the quiz, one or more for Nous deux). */
    @Transactional
    public LiveDtos.View answer(String username, long id, LiveDtos.Answer request) {
        synchronized (LOCK) {
            User me = user(username);
            LiveGame g = mine(me, id);
            Instant now = clock.instant();
            if (!LiveGame.PLAYING.equals(g.getStatus()) || !LiveGame.QUESTION.equals(g.getPhase())
                    || now.isAfter(g.getDeadline().plus(GRACE))) {
                throw new ConflictException("Trop tard pour cette question");
            }
            boolean host = g.getHost().getId().equals(me.getId());
            List<Item> items = items(g);
            List<Slot> slots = new ArrayList<>(slots(g));
            Item item = items.get(g.getIndex());
            Slot slot = slots.get(g.getIndex());
            if ((host ? slot.h() : slot.g()) != null) {
                throw new ConflictException("Déjà répondu");
            }
            List<Integer> choices = request == null ? null : request.choices();
            if (choices == null || choices.isEmpty() || (QUIZ.equals(g.getKind()) && choices.size() != 1)) {
                throw new ContentValidationException(QUIZ.equals(g.getKind()) ? "Une seule réponse" : "Coche au moins une réponse");
            }
            int mask = 0;
            for (Integer c : choices) {
                if (c == null || c < 0 || c >= item.o().size()) {
                    throw new ContentValidationException("Réponse invalide");
                }
                mask |= 1 << c;
            }
            int points = 0;
            if (QUIZ.equals(g.getKind()) && choices.get(0) == item.c()) {
                long left = Math.max(0, Duration.between(now, g.getDeadline()).toMillis());
                points = 100 + (int) (50 * left / (g.getSeconds() * 1000L));
            }
            slots.set(g.getIndex(), slot.with(host, mask, points));
            g.setAnswers(write(slots));
            Slot done = slots.get(g.getIndex());
            if (done.h() != null && done.g() != null) {
                reveal(g, slots, now);
            }
            changed(g);
            return view(g);
        }
    }

    /** Back after a pause: the question starts over with a fresh clock (for the one who hadn't answered). */
    @Transactional
    public LiveDtos.View resume(String username, long id) {
        synchronized (LOCK) {
            User me = user(username);
            LiveGame g = mine(me, id);
            if (!LiveGame.PAUSED.equals(g.getStatus())) {
                throw new ConflictException("La partie n'est pas en pause");
            }
            if (!waiting(g).contains(me.getId())) {
                throw new ConflictException("C'est l'autre qu'on attend : relance-le·la");
            }
            Instant now = clock.instant();
            g.ask(g.getIndex(), now.plusSeconds(g.getSeconds()), now);
            changed(g);
            return view(g);
        }
    }

    /** "Relancer": a gentle push to the one we are waiting for (once a minute at most). */
    @Transactional(readOnly = true)
    public void nudge(String username, long id) {
        User me = user(username);
        LiveGame g = mine(me, id);
        if (!LiveGame.PAUSED.equals(g.getStatus()) && !LiveGame.INVITED.equals(g.getStatus())) {
            throw new ConflictException("Personne à relancer");
        }
        Instant now = clock.instant();
        Instant last = lastNudge.get(g.getId());
        if (last != null && now.isBefore(last.plus(NUDGE_EVERY))) {
            throw new ConflictException("Déjà relancé·e il y a moins d'une minute");
        }
        lastNudge.put(g.getId(), now);
        User other = g.getHost().getId().equals(me.getId()) ? g.getGuest() : g.getHost();
        notice(other, me.getDisplayName() + " t'attend pour la partie en direct ⚡", g);
    }

    @Transactional
    public LiveDtos.View quit(String username, long id) {
        synchronized (LOCK) {
            LiveGame g = mine(user(username), id);
            if (!g.isActive()) {
                throw new ConflictException("La partie est déjà finie");
            }
            g.end(LiveGame.DONE, "abandon", clock.instant());
            changed(g);
            return view(g);
        }
    }

    /** The clock (LiveTicker, every second): time up → reveal / pause, reveal over → next, pauses and invitations expire. */
    @Transactional
    public void tick() {
        synchronized (LOCK) {
            Instant now = clock.instant();
            for (LiveGame g : games.findByStatusIn(ACTIVE)) {
                if (LiveGame.INVITED.equals(g.getStatus())) {
                    if (now.isAfter(g.getCreatedAt().plus(INVITE_MAX))) {
                        g.end(LiveGame.CANCELLED, "expired", now);
                        changed(g);
                    }
                } else if (LiveGame.PAUSED.equals(g.getStatus())) {
                    if (now.isAfter(g.getPausedAt().plus(PAUSE_MAX))) {
                        g.end(LiveGame.DONE, "expired", now);
                        changed(g);
                    }
                } else if (LiveGame.QUESTION.equals(g.getPhase()) && now.isAfter(g.getDeadline().plus(GRACE))) {
                    g.pause(now);
                    changed(g);
                    for (Long missing : waiting(g)) {
                        boolean hostMissing = g.getHost().getId().equals(missing);
                        User who = hostMissing ? g.getHost() : g.getGuest();
                        User other = hostMissing ? g.getGuest() : g.getHost();
                        notice(who, other.getDisplayName() + " t'attend : la partie en direct est en pause ⏸", g);
                    }
                } else if (LiveGame.REVEAL.equals(g.getPhase()) && !now.isBefore(g.getDeadline())) {
                    int next = g.getIndex() + 1;
                    if (next < items(g).size()) {
                        g.ask(next, now.plusSeconds(g.getSeconds()), now);
                    } else {
                        g.end(LiveGame.DONE, "finished", now);
                    }
                    changed(g);
                }
            }
        }
    }

    private void reveal(LiveGame g, List<Slot> slots, Instant now) {
        Slot s = slots.get(g.getIndex());
        if (NOUS.equals(g.getKind())) {
            int common = Integer.bitCount(s.h() & s.g());
            int union = Integer.bitCount(s.h() | s.g());
            int points = union == 0 ? 0 : Math.round(100f * common / union);
            s = new Slot(s.h(), s.g(), points, points);
            slots.set(g.getIndex(), s);
            g.setAnswers(write(slots));
        }
        g.addScores(s.hp(), s.gp());
        g.reveal(now.plus(REVEAL), now);
    }

    /** Who the current question still waits for. */
    private List<Long> waiting(LiveGame g) {
        if (!LiveGame.PAUSED.equals(g.getStatus()) && !LiveGame.PLAYING.equals(g.getStatus())) {
            return List.of();
        }
        Slot s = slots(g).get(g.getIndex());
        List<Long> out = new ArrayList<>();
        if (s.h() == null) {
            out.add(g.getHost().getId());
        }
        if (s.g() == null) {
            out.add(g.getGuest().getId());
        }
        return out;
    }

    LiveDtos.View view(LiveGame g) {
        List<Item> items = items(g);
        List<Slot> slots = slots(g);
        boolean asking = LiveGame.PLAYING.equals(g.getStatus()) || LiveGame.PAUSED.equals(g.getStatus());
        int shownUpTo = LiveGame.DONE.equals(g.getStatus()) ? items.size()
                : LiveGame.REVEAL.equals(g.getPhase()) ? g.getIndex() + 1 : g.getIndex();
        List<LiveDtos.Round> rounds = new ArrayList<>();
        for (int i = 0; i < Math.min(shownUpTo, items.size()); i++) {
            Item it = items.get(i);
            Slot s = slots.get(i);
            if (s.h() == null && s.g() == null && LiveGame.DONE.equals(g.getStatus())) {
                continue; // never reached
            }
            rounds.add(new LiveDtos.Round(i, it.t(), it.o(), it.c(), list(s.h()), list(s.g()), s.hp(), s.gp()));
        }
        Slot now = g.getIndex() < slots.size() ? slots.get(g.getIndex()) : new Slot(null, null, 0, 0);
        Item current = g.getIndex() < items.size() ? items.get(g.getIndex()) : null;
        return new LiveDtos.View(g.getId(), g.getKind(), g.getLabel(), g.getStatus(), g.getPhase(), g.getIndex(), items.size(),
                g.getSeconds(), g.getDeadline() == null ? null : g.getDeadline().toEpochMilli(), clock.instant().toEpochMilli(),
                g.getPausedAt() == null ? null : g.getPausedAt().plus(PAUSE_MAX).toEpochMilli(),
                g.getHost().getId(), g.getHost().getDisplayName(), g.getGuest().getId(), g.getGuest().getDisplayName(),
                asking && current != null ? new LiveDtos.Question(current.t(), current.o(), NOUS.equals(g.getKind())) : null,
                now.h() != null, now.g() != null, LiveGame.PAUSED.equals(g.getStatus()) ? waiting(g) : List.of(),
                g.getHostScore(), g.getGuestScore(), g.getEndedReason(), rounds);
    }

    private void changed(LiveGame g) {
        events.publishEvent(new LiveEvents.Changed(g.getId()));
    }

    private void notice(User to, String body, LiveGame g) {
        events.publishEvent(new LiveEvents.Notice(to.getId(), body, "/jeux/direct", "live-" + g.getId()));
    }

    private LiveGame mine(User me, long id) {
        return games.findById(id).filter(g -> g.isPlayer(me.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Partie introuvable"));
    }

    private List<Item> items(LiveGame g) {
        return read(g.getItems(), new TypeReference<>() {
        });
    }

    private List<Slot> slots(LiveGame g) {
        return read(g.getAnswers(), new TypeReference<>() {
        });
    }

    private static List<Integer> list(Integer mask) {
        if (mask == null) {
            return null;
        }
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < 31; i++) {
            if ((mask & (1 << i)) != 0) {
                out.add(i);
            }
        }
        return out;
    }

    private String write(Object o) {
        try {
            return json.writeValueAsString(o);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Live: not serialisable", e);
        }
    }

    private <T> T read(String s, TypeReference<T> type) {
        try {
            return json.readValue(s, type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Live: stored game unreadable", e);
        }
    }

    private User user(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
