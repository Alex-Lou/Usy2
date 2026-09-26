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
import org.springframework.beans.factory.annotation.Autowired;
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
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * The quiz: a map of levels per theme (5 each, the next one opens with a
 * star), and "Toi & moi" where each answers about themself and the other
 * guesses. A run is held by the server (questions, right answers, timing) so
 * the phone only learns an answer once it has answered; runs live in memory
 * for 30 minutes (a restart just means starting the level again).
 */
@Service
public class QuizService {

    static final int PER_RUN = 10;
    static final int SECONDS = 20;
    static final int MIN_SELF = 3;
    private static final Duration GRACE = Duration.ofSeconds(3);
    private static final Duration RUN_TTL = Duration.ofMinutes(30);
    private static final int MAX_RUNS = 200;
    public static final String TOI = "toi";

    /** A question as played: its options in the order shown, which one is right, and who it is about. */
    record Item(String text, List<String> options, int correct, String about) {
    }

    /**
     * Told about a run that isn't an ordinary level (a "défi", QuizChallengeService):
     * each answer as it comes, then the end, which it scores itself (no stars kept).
     */
    interface RunListener {
        void answered(String marks, int score);

        QuizDtos.Result finished(String marks, int score, int correct, int total);
    }

    private static final class Run {
        final String id = UUID.randomUUID().toString();
        final Long userId;
        final String theme;
        final int level;
        final List<Item> items;
        final Instant createdAt;
        final RunListener listener;
        final String key;
        final StringBuilder marks = new StringBuilder();
        int index;
        int score;
        int correct;
        int streak;
        Instant servedAt;

        Run(Long userId, String theme, int level, List<Item> items, Instant now) {
            this(userId, theme, level, items, now, null, null);
        }

        Run(Long userId, String theme, int level, List<Item> items, Instant now, RunListener listener, String key) {
            this.userId = userId;
            this.theme = theme;
            this.level = level;
            this.items = items;
            this.createdAt = now;
            this.servedAt = now;
            this.listener = listener;
            this.key = key;
        }

        String levelKey() {
            return theme.equals(TOI) ? TOI : QuizBank.key(theme, level);
        }
    }

    private final QuizBank bank;
    private final UserRepository users;
    private final QuizProgressRepository progress;
    private final QuizSelfAnswerRepository selfAnswers;
    private final Clock clock;
    private final Map<String, Run> runs = new ConcurrentHashMap<>();

    @Autowired
    public QuizService(QuizBank bank, UserRepository users, QuizProgressRepository progress, QuizSelfAnswerRepository selfAnswers) {
        this(bank, users, progress, selfAnswers, Clock.systemUTC());
    }

    QuizService(QuizBank bank, UserRepository users, QuizProgressRepository progress, QuizSelfAnswerRepository selfAnswers, Clock clock) {
        this.bank = bank;
        this.users = users;
        this.progress = progress;
        this.selfAnswers = selfAnswers;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public QuizDtos.Overview overview(String username) {
        User me = user(username);
        Map<String, QuizProgress> mine = progress.findByUserId(me.getId()).stream()
                .collect(Collectors.toMap(QuizProgress::getLevelKey, p -> p));
        List<QuizDtos.Theme> themes = QuizBank.THEMES.stream().map(t -> {
            List<QuizDtos.Level> levels = new ArrayList<>();
            for (int l = 1; l <= QuizBank.LEVELS; l++) {
                QuizProgress p = mine.get(QuizBank.key(t.id(), l));
                levels.add(new QuizDtos.Level(l, p == null ? 0 : p.getStars(), p == null ? 0 : p.getBestScore(), unlocked(mine, t.id(), l)));
            }
            return new QuizDtos.Theme(t.id(), t.label(), t.emoji(), t.color(), levels);
        }).toList();
        Optional<User> partner = partner(me);
        QuizProgress toi = mine.get(TOI);
        QuizDtos.Toi toiDto = new QuizDtos.Toi(bank.self().size(), selfAnswers.findByUserId(me.getId()).size(),
                partner.map(p -> selfAnswers.findByUserId(p.getId()).size()).orElse(0),
                partner.map(User::getDisplayName).orElse(null),
                toi == null ? 0 : toi.getStars(), toi == null ? 0 : toi.getBestScore());
        return new QuizDtos.Overview(themes, toiDto);
    }

    /** Starts a level (or a "Toi & moi" guessing run): its questions shuffled, the first one served. */
    @Transactional(readOnly = true)
    public QuizDtos.Run start(String username, QuizDtos.Start request) {
        User me = user(username);
        String theme = request == null ? null : request.theme();
        List<Item> items;
        int level = 0;
        if (TOI.equals(theme)) {
            User partner = partner(me).orElseThrow(() -> new ConflictException("Personne à deviner pour l'instant"));
            List<QuizSelfAnswer> answered = new ArrayList<>(selfAnswers.findByUserId(partner.getId()));
            if (answered.size() < MIN_SELF) {
                throw new ConflictException(partner.getDisplayName() + " doit d'abord répondre à au moins " + MIN_SELF + " questions sur soi");
            }
            Collections.shuffle(answered, ThreadLocalRandom.current());
            items = answered.stream()
                    .flatMap(a -> bank.selfQuestion(a.getQuestionId()).stream()
                            .filter(q -> a.getChoice() >= 0 && a.getChoice() < q.options().size())
                            .map(q -> new Item(q.text(), q.options(), a.getChoice(), partner.getDisplayName())))
                    .limit(PER_RUN)
                    .toList();
        } else {
            level = request.level() == null ? 0 : request.level();
            items = levelItems(me, theme, level);
        }
        if (items.isEmpty()) {
            throw new ConflictException("Pas de questions ici pour l'instant");
        }
        Instant now = clock.instant();
        forget(now);
        Run run = new Run(me.getId(), theme, level, items, now);
        runs.put(run.id, run);
        return new QuizDtos.Run(run.id, theme, level, question(run));
    }

    /** Ten shuffled questions of one of my open levels. */
    List<Item> levelItems(User me, String theme, int level) {
        QuizBank.Theme t = QuizBank.theme(theme == null ? "" : theme).orElseThrow(() -> new ContentValidationException("Thème inconnu"));
        if (level < 1 || level > QuizBank.LEVELS) {
            throw new ContentValidationException("Niveau inconnu");
        }
        Map<String, QuizProgress> mine = progress.findByUserId(me.getId()).stream()
                .collect(Collectors.toMap(QuizProgress::getLevelKey, p -> p));
        if (!unlocked(mine, t.id(), level)) {
            throw new ConflictException("Gagne au moins une étoile au niveau " + (level - 1) + " pour ouvrir celui-ci");
        }
        List<QuizBank.Question> pool = new ArrayList<>(bank.level(t.id(), level));
        Collections.shuffle(pool, ThreadLocalRandom.current());
        return pool.stream().limit(PER_RUN).map(QuizService::shuffled).toList();
    }

    /** Ten questions picked across every theme (levels 1 to {@code maxLevel}). */
    List<Item> mixItems(int maxLevel) {
        List<QuizBank.Question> pool = new ArrayList<>();
        for (QuizBank.Theme t : QuizBank.THEMES) {
            for (int l = 1; l <= maxLevel; l++) {
                pool.addAll(bank.level(t.id(), l));
            }
        }
        Collections.shuffle(pool, ThreadLocalRandom.current());
        return pool.stream().limit(PER_RUN).map(QuizService::shuffled).toList();
    }

    /**
     * Starts a run on given questions from question {@code from} on (a "défi"
     * picked up again), told to {@code listener}. A run with the same {@code key}
     * is dropped first, so one challenge never has two runs at once.
     */
    QuizDtos.Run startWith(User me, String theme, int level, List<Item> items, String marksSoFar, int scoreSoFar,
                           RunListener listener, String key) {
        if (marksSoFar.length() >= items.size()) {
            throw new ConflictException("Partie déjà terminée");
        }
        Instant now = clock.instant();
        forget(now);
        runs.values().removeIf(r -> key.equals(r.key));
        Run run = new Run(me.getId(), theme, level, items, now, listener, key);
        run.index = marksSoFar.length();
        run.marks.append(marksSoFar);
        run.score = scoreSoFar;
        run.correct = (int) marksSoFar.chars().filter(c -> c == '1').count();
        runs.put(run.id, run);
        return new QuizDtos.Run(run.id, theme, level, question(run));
    }

    /** One answer ({@code choice} −1 = time ran out): scored, then the next question or the result. */
    @Transactional
    public QuizDtos.Answered answer(String username, String runId, int choice) {
        User me = user(username);
        Run run = runs.get(runId == null ? "" : runId);
        if (run == null || !run.userId.equals(me.getId())) {
            throw new ResourceNotFoundException("Partie terminée ou expirée : relance le niveau");
        }
        synchronized (run) {
            if (run.index >= run.items.size()) {
                throw new ResourceNotFoundException("Partie déjà terminée");
            }
            Item item = run.items.get(run.index);
            if (choice < -1 || choice >= item.options().size()) {
                throw new ContentValidationException("Réponse invalide");
            }
            Duration took = Duration.between(run.servedAt, clock.instant());
            boolean inTime = took.compareTo(Duration.ofSeconds(SECONDS).plus(GRACE)) <= 0;
            boolean right = inTime && choice == item.correct();
            int gained = 0;
            if (right) {
                long left = Math.max(0, SECONDS * 1000L - took.toMillis());
                run.streak++;
                gained = 100 + (int) (50 * left / (SECONDS * 1000L)) + Math.min(run.streak - 1, 5) * 10;
                run.correct++;
                run.score += gained;
            } else {
                run.streak = 0;
            }
            run.index++;
            run.marks.append(right ? '1' : '0');
            run.servedAt = clock.instant();
            if (run.index < run.items.size()) {
                if (run.listener != null) {
                    run.listener.answered(run.marks.toString(), run.score);
                }
                return new QuizDtos.Answered(right, item.correct(), gained, run.score, run.streak, question(run), null);
            }
            runs.remove(run.id);
            QuizDtos.Result result = run.listener != null
                    ? run.listener.finished(run.marks.toString(), run.score, run.correct, run.items.size())
                    : finish(me, run);
            return new QuizDtos.Answered(right, item.correct(), gained, run.score, run.streak, null, result);
        }
    }

    @Transactional(readOnly = true)
    public List<QuizDtos.SelfItem> selfList(String username) {
        User me = user(username);
        Map<String, Integer> mine = selfAnswers.findByUserId(me.getId()).stream()
                .collect(Collectors.toMap(QuizSelfAnswer::getQuestionId, QuizSelfAnswer::getChoice));
        return bank.self().stream().map(q -> new QuizDtos.SelfItem(q.id(), q.text(), q.options(), mine.get(q.id()))).toList();
    }

    @Transactional
    public void selfAnswer(String username, QuizDtos.SelfAnswer request) {
        User me = user(username);
        QuizBank.SelfQuestion q = bank.selfQuestion(request == null || request.id() == null ? "" : request.id())
                .orElseThrow(() -> new ContentValidationException("Question inconnue"));
        if (request.choice() < 0 || request.choice() >= q.options().size()) {
            throw new ContentValidationException("Réponse invalide");
        }
        QuizSelfAnswer a = selfAnswers.findByUserIdAndQuestionId(me.getId(), q.id())
                .orElseGet(() -> new QuizSelfAnswer(me, q.id(), request.choice()));
        a.setChoice(request.choice());
        selfAnswers.save(a);
    }

    private QuizDtos.Result finish(User me, Run run) {
        int total = run.items.size();
        int stars = stars(run.correct, total);
        QuizProgress p = progress.findByUserIdAndLevelKey(me.getId(), run.levelKey())
                .orElseGet(() -> new QuizProgress(me, run.levelKey()));
        boolean hadStar = p.getStars() > 0;
        boolean newBest = p.record(stars, run.score);
        progress.save(p);
        boolean unlockedNext = !run.theme.equals(TOI) && run.level < QuizBank.LEVELS && !hadStar && stars > 0;
        return new QuizDtos.Result(run.score, run.correct, total, stars, p.getBestScore(), newBest, unlockedNext, null, false);
    }

    static int stars(int correct, int total) {
        double ratio = (double) correct / total;
        return ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.5 ? 1 : 0;
    }

    private static QuizDtos.Question question(Run run) {
        Item item = run.items.get(run.index);
        return new QuizDtos.Question(run.index + 1, run.items.size(), item.text(), item.options(), SECONDS, item.about());
    }

    /** A bank question with its options in a random order (the right one moves with them). */
    private static Item shuffled(QuizBank.Question q) {
        List<Integer> order = new ArrayList<>(List.of(0, 1, 2, 3).subList(0, q.options().size()));
        Collections.shuffle(order, ThreadLocalRandom.current());
        return new Item(q.text(), order.stream().map(q.options()::get).toList(), order.indexOf(0), null);
    }

    private static boolean unlocked(Map<String, QuizProgress> mine, String theme, int level) {
        if (level <= 1) {
            return true;
        }
        QuizProgress before = mine.get(QuizBank.key(theme, level - 1));
        return before != null && before.getStars() > 0;
    }

    /** Old or surplus runs go (oldest first), so memory stays bounded. */
    private void forget(Instant now) {
        runs.values().removeIf(r -> r.createdAt.plus(RUN_TTL).isBefore(now));
        while (runs.size() >= MAX_RUNS) {
            runs.values().stream().min((a, b) -> a.createdAt.compareTo(b.createdAt)).ifPresent(r -> runs.remove(r.id));
        }
    }

    Optional<User> partner(User me) {
        return users.findAll().stream().filter(u -> !u.getId().equals(me.getId())).findFirst();
    }

    User user(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
