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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 💞 Nous deux: cards to talk about (favourites, "on en a parlé"), answers
 * about oneself, and guesses about the other one. Guessed choices are judged
 * at once (the same ticks right, some in common close, none wrong); guessed words wait for the verdict of the person it is about. An
 * answer stays hidden from the other one until they have guessed it; changing
 * it clears their guesses about it (they guess again).
 */
@Service
public class NousService {

    static final int MAX_TEXT = 280;
    static final int MAX_NOTE = 140;
    private static final ZoneId HOME = ZoneId.of("Europe/Paris");
    private static final Set<String> VERDICTS = Set.of(NousGuess.RIGHT, NousGuess.CLOSE, NousGuess.WRONG);

    private final NousBank bank;
    private final UserRepository users;
    private final NousAnswerRepository answers;
    private final NousGuessRepository guesses;
    private final NousMarkRepository marks;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Autowired
    public NousService(NousBank bank, UserRepository users, NousAnswerRepository answers, NousGuessRepository guesses,
                       NousMarkRepository marks, ApplicationEventPublisher events) {
        this(bank, users, answers, guesses, marks, events, Clock.systemUTC());
    }

    NousService(NousBank bank, UserRepository users, NousAnswerRepository answers, NousGuessRepository guesses,
                NousMarkRepository marks, ApplicationEventPublisher events, Clock clock) {
        this.bank = bank;
        this.users = users;
        this.answers = answers;
        this.guesses = guesses;
        this.marks = marks;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public NousDtos.Overview overview(String username) {
        User me = user(username);
        Optional<User> partner = partner(me);
        List<NousBank.Question> all = bank.all();
        List<NousDtos.Theme> themes = NousBank.THEMES.stream().map(t -> new NousDtos.Theme(t.id(), t.label(), t.emoji(), t.color(),
                (int) all.stream().filter(q -> q.theme().equals(t.id())).count(),
                (int) all.stream().filter(q -> q.theme().equals(t.id()) && q.guessable()).count())).toList();
        Set<String> mine = answered(me.getId());
        Set<String> theirs = partner.map(p -> answered(p.getId())).orElse(Set.of());
        List<NousGuess> myGuesses = guesses.findByGuesserIdOrderByCreatedAtDesc(me.getId());
        List<NousGuess> aboutMe = guesses.findByAuthorIdOrderByCreatedAtDesc(me.getId());
        Set<String> guessed = myGuesses.stream().map(NousGuess::getQuestionId).collect(Collectors.toSet());
        int toGuess = (int) theirs.stream().filter(id -> !guessed.contains(id)).count();
        int toJudge = (int) aboutMe.stream().filter(g -> g.getVerdict() == null).count();
        NousDtos.Card daily = daily(all).map(q -> card(q, me, mine, marksOf())).orElse(null);
        return new NousDtos.Overview(partner.map(User::getDisplayName).orElse(null), themes,
                (int) all.stream().filter(NousBank.Question::guessable).count(), mine.size(), theirs.size(), toGuess, toJudge,
                score(myGuesses), score(aboutMe), daily);
    }

    /** The cards of a theme (all of them when {@code theme} is blank). */
    @Transactional(readOnly = true)
    public List<NousDtos.Card> cards(String username, String theme) {
        User me = user(username);
        Set<String> mine = answered(me.getId());
        List<NousMark> all = marksOf();
        return bank.all().stream().filter(q -> theme == null || theme.isBlank() || q.theme().equals(theme))
                .map(q -> card(q, me, mine, all)).toList();
    }

    @Transactional
    public void mark(String username, NousDtos.Mark request) {
        User me = user(username);
        NousBank.Question q = question(request == null ? null : request.id());
        String kind = request.kind();
        if (!NousMark.FAV.equals(kind) && !NousMark.TALKED.equals(kind)) {
            throw new ContentValidationException("Marque inconnue");
        }
        Optional<NousMark> existing = marks.findByUserIdAndQuestionIdAndKind(me.getId(), q.id(), kind);
        if (request.on() && existing.isEmpty()) {
            marks.save(new NousMark(me, q.id(), kind));
        } else if (!request.on()) {
            existing.ifPresent(marks::delete);
            if (NousMark.TALKED.equals(kind)) {
                // "on en a parlé" is shared: taking it back takes it back for both.
                partner(me).flatMap(p -> marks.findByUserIdAndQuestionIdAndKind(p.getId(), q.id(), kind)).ifPresent(marks::delete);
            }
        }
    }

    /** My questions (choices and own words) with what I answered. */
    @Transactional(readOnly = true)
    public List<NousDtos.Mine> mine(String username, String theme) {
        User me = user(username);
        Map<String, NousAnswer> mine = answers.findByUserId(me.getId()).stream()
                .collect(Collectors.toMap(NousAnswer::getQuestionId, Function.identity()));
        return bank.all().stream().filter(NousBank.Question::guessable)
                .filter(q -> theme == null || theme.isBlank() || q.theme().equals(theme))
                .map(q -> {
                    NousAnswer a = mine.get(q.id());
                    return new NousDtos.Mine(q.id(), q.theme(), q.kind(), q.text(), q.options(),
                            a == null ? null : list(a.getChoices()), a == null ? null : a.getText());
                }).toList();
    }

    @Transactional
    public void answer(String username, NousDtos.Answer request) {
        User me = user(username);
        NousBank.Question q = question(request == null ? null : request.id());
        if (!q.guessable()) {
            throw new ContentValidationException("Cette carte est juste pour en parler");
        }
        Integer choices = NousBank.CHOICE.equals(q.kind()) ? mask(q, request.choices()) : null;
        String text = NousBank.WORDS.equals(q.kind()) ? words(request.text(), MAX_TEXT) : null;
        NousAnswer a = answers.findByUserIdAndQuestionId(me.getId(), q.id()).orElseGet(() -> new NousAnswer(me, q.id()));
        if (a.set(choices, text, clock.instant())) {
            guesses.deleteByAuthorIdAndQuestionId(me.getId(), q.id());
        }
        answers.save(a);
    }

    @Transactional
    public void forget(String username, String id) {
        User me = user(username);
        NousBank.Question q = question(id);
        answers.findByUserIdAndQuestionId(me.getId(), q.id()).ifPresent(a -> {
            answers.delete(a);
            guesses.deleteByAuthorIdAndQuestionId(me.getId(), q.id());
        });
    }

    /** The other one's answered questions I haven't guessed yet (without their answers). */
    @Transactional(readOnly = true)
    public List<NousDtos.ToGuess> toGuess(String username) {
        User me = user(username);
        User partner = partner(me).orElseThrow(() -> new ConflictException("Personne à deviner pour l'instant"));
        Set<String> guessed = guesses.findByGuesserIdOrderByCreatedAtDesc(me.getId()).stream()
                .map(NousGuess::getQuestionId).collect(Collectors.toSet());
        Set<String> theirs = answered(partner.getId());
        return bank.all().stream().filter(q -> q.guessable() && theirs.contains(q.id()) && !guessed.contains(q.id()))
                .map(q -> new NousDtos.ToGuess(q.id(), q.theme(), q.kind(), q.text(), q.options())).toList();
    }

    /** One guess: the answer is revealed at once; choices are judged, words wait for the other one's verdict. */
    @Transactional
    public NousDtos.Reveal guess(String username, NousDtos.Answer request) {
        User me = user(username);
        User partner = partner(me).orElseThrow(() -> new ConflictException("Personne à deviner pour l'instant"));
        NousBank.Question q = question(request == null ? null : request.id());
        NousAnswer theirs = answers.findByUserIdAndQuestionId(partner.getId(), q.id())
                .orElseThrow(() -> new ConflictException(partner.getDisplayName() + " n'a pas encore répondu à celle-ci"));
        if (guesses.findByGuesserIdAndQuestionId(me.getId(), q.id()).isPresent()) {
            throw new ConflictException("Déjà deviné");
        }
        NousGuess g;
        if (NousBank.CHOICE.equals(q.kind())) {
            int guessed = mask(q, request.choices());
            g = new NousGuess(me, partner, q.id(), guessed, null, clock.instant());
            g.judge(verdict(guessed, theirs.getChoices()), null, clock.instant());
            g = guesses.save(g);
        } else {
            g = guesses.save(new NousGuess(me, partner, q.id(), null, words(request.text(), MAX_TEXT), clock.instant()));
            events.publishEvent(new CoupleActivity(CoupleActivity.NOUS_GUESS, me.getId(), me.getDisplayName(), null, g.getId()));
        }
        return reveal(g, q, theirs);
    }

    @Transactional(readOnly = true)
    public NousDtos.History history(String username) {
        User me = user(username);
        User partner = partner(me).orElse(null);
        Map<String, NousAnswer> mine = byQuestion(me.getId());
        Map<String, NousAnswer> theirs = partner == null ? Map.of() : byQuestion(partner.getId());
        return new NousDtos.History(reveals(guesses.findByGuesserIdOrderByCreatedAtDesc(me.getId()), theirs),
                reveals(guesses.findByAuthorIdOrderByCreatedAtDesc(me.getId()), mine));
    }

    /** My verdict on a guess about me (in words): right, close or wrong, with a little note. */
    @Transactional
    public NousDtos.Reveal judge(String username, long guessId, NousDtos.Judge request) {
        User me = user(username);
        NousGuess g = guesses.findById(guessId).filter(x -> x.getAuthor().getId().equals(me.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Devinette introuvable"));
        NousBank.Question q = question(g.getQuestionId());
        if (!NousBank.WORDS.equals(q.kind())) {
            throw new ConflictException("Les choix se corrigent tout seuls");
        }
        String verdict = request == null ? null : request.verdict();
        if (verdict == null || !VERDICTS.contains(verdict)) {
            throw new ContentValidationException("Verdict inconnu");
        }
        String note = request.note() == null || request.note().isBlank() ? null : words(request.note(), MAX_NOTE);
        boolean first = g.getVerdict() == null;
        g.judge(verdict, note, clock.instant());
        if (first) {
            events.publishEvent(new CoupleActivity(CoupleActivity.NOUS_JUDGED, me.getId(), me.getDisplayName(), verdict, g.getId()));
        }
        return reveal(g, q, answers.findByUserIdAndQuestionId(me.getId(), q.id()).orElse(null));
    }

    private List<NousDtos.Reveal> reveals(List<NousGuess> list, Map<String, NousAnswer> answersOf) {
        return list.stream().flatMap(g -> bank.question(g.getQuestionId()).stream()
                .map(q -> reveal(g, q, answersOf.get(q.id())))).toList();
    }

    private static NousDtos.Reveal reveal(NousGuess g, NousBank.Question q, NousAnswer answer) {
        return new NousDtos.Reveal(g.getId() == null ? 0 : g.getId(), q.id(), q.theme(), q.kind(), q.text(), q.options(),
                list(g.getChoices()), g.getText(), answer == null ? null : list(answer.getChoices()), answer == null ? null : answer.getText(),
                g.getVerdict(), g.getNote(), g.getCreatedAt());
    }

    private NousDtos.Card card(NousBank.Question q, User me, Set<String> mine, List<NousMark> all) {
        boolean fav = all.stream().anyMatch(m -> m.getQuestionId().equals(q.id()) && NousMark.FAV.equals(m.getKind())
                && m.getUser().getId().equals(me.getId()));
        boolean talked = all.stream().anyMatch(m -> m.getQuestionId().equals(q.id()) && NousMark.TALKED.equals(m.getKind()));
        return new NousDtos.Card(q.id(), q.theme(), q.kind(), q.text(), q.options(), fav, talked, mine.contains(q.id()));
    }

    /** The same card for both of us each day (Paris time): one to talk about or to answer in words. */
    private Optional<NousBank.Question> daily(List<NousBank.Question> all) {
        List<NousBank.Question> pool = all.stream().filter(q -> !NousBank.CHOICE.equals(q.kind())).toList();
        if (pool.isEmpty()) {
            return Optional.empty();
        }
        long day = LocalDate.now(clock.withZone(HOME)).toEpochDay();
        return Optional.of(pool.get((int) Math.floorMod(day * 7919L, pool.size())));
    }

    private static NousDtos.Score score(List<NousGuess> list) {
        int right = 0;
        int close = 0;
        int wrong = 0;
        int pending = 0;
        for (NousGuess g : list) {
            if (g.getVerdict() == null) {
                pending++;
            } else if (NousGuess.RIGHT.equals(g.getVerdict())) {
                right++;
            } else if (NousGuess.CLOSE.equals(g.getVerdict())) {
                close++;
            } else {
                wrong++;
            }
        }
        int judged = right + close + wrong;
        return new NousDtos.Score(right, close, wrong, pending, judged == 0 ? null : Math.round(100f * (2 * right + close) / (2 * judged)));
    }

    private List<NousMark> marksOf() {
        return marks.findAll();
    }

    private Set<String> answered(Long userId) {
        return answers.findByUserId(userId).stream().map(NousAnswer::getQuestionId).collect(Collectors.toSet());
    }

    private Map<String, NousAnswer> byQuestion(Long userId) {
        return answers.findByUserId(userId).stream().collect(Collectors.toMap(NousAnswer::getQuestionId, Function.identity()));
    }

    private NousBank.Question question(String id) {
        return bank.question(id).orElseThrow(() -> new ContentValidationException("Question inconnue"));
    }

    /** The ticked options as a bit set: at least one, each an option of the question. */
    static int mask(NousBank.Question q, List<Integer> choices) {
        if (choices == null || choices.isEmpty()) {
            throw new ContentValidationException("Coche au moins une réponse");
        }
        int mask = 0;
        for (Integer c : choices) {
            if (c == null || c < 0 || c >= q.options().size()) {
                throw new ContentValidationException("Réponse invalide");
            }
            mask |= 1 << c;
        }
        return mask;
    }

    /** The same ticks: right; some in common: close; none: wrong. */
    static String verdict(int guessed, Integer answer) {
        int a = answer == null ? 0 : answer;
        return guessed == a ? NousGuess.RIGHT : (guessed & a) != 0 ? NousGuess.CLOSE : NousGuess.WRONG;
    }

    private static List<Integer> list(Integer mask) {
        if (mask == null) {
            return null;
        }
        List<Integer> out = new java.util.ArrayList<>();
        for (int i = 0; i < NousBank.MAX_OPTIONS; i++) {
            if ((mask & (1 << i)) != 0) {
                out.add(i);
            }
        }
        return out;
    }

    private static String words(String text, int max) {
        String t = text == null ? "" : text.strip();
        if (t.isEmpty()) {
            throw new ContentValidationException("Écris quelque chose");
        }
        if (t.length() > max) {
            throw new ContentValidationException("Trop long (" + max + " caractères au plus)");
        }
        return t;
    }

    private Optional<User> partner(User me) {
        return users.findAll().stream().filter(u -> !u.getId().equals(me.getId())).findFirst();
    }

    private User user(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
