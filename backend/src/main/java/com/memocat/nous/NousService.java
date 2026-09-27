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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 💞 Nous deux: cards to talk about (favourites, "on en a parlé"), answers
 * about oneself, and guesses about the other one. Guessed choices, a single
 * choice, a scale, a ranking and a hangman are judged at once (see
 * {@link #marked}); words wait for the verdict of the person it is about (a
 * short answer only when it isn't the same word). An answer stays hidden from
 * the other one until they have guessed it; changing it clears their guesses
 * about it (they guess again). Either of us can start their own answers again
 * (a theme or all); starting again for both waits for the other one's yes.
 */
@Service
public class NousService {

    static final int MAX_TEXT = 280;
    static final int MAX_NOTE = 140;
    static final int MAX_SHORT = 40;
    private static final ZoneId HOME = ZoneId.of("Europe/Paris");
    private static final Set<String> VERDICTS = Set.of(NousGuess.RIGHT, NousGuess.CLOSE, NousGuess.WRONG);

    private final NousBank bank;
    private final UserRepository users;
    private final NousAnswerRepository answers;
    private final NousGuessRepository guesses;
    private final NousMarkRepository marks;
    private final NousResetRepository resets;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Autowired
    public NousService(NousBank bank, UserRepository users, NousAnswerRepository answers, NousGuessRepository guesses,
                       NousMarkRepository marks, NousResetRepository resets, ApplicationEventPublisher events) {
        this(bank, users, answers, guesses, marks, resets, events, Clock.systemUTC());
    }

    NousService(NousBank bank, UserRepository users, NousAnswerRepository answers, NousGuessRepository guesses,
                NousMarkRepository marks, NousResetRepository resets, ApplicationEventPublisher events, Clock clock) {
        this.bank = bank;
        this.users = users;
        this.answers = answers;
        this.guesses = guesses;
        this.marks = marks;
        this.resets = resets;
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
        List<NousGuess> myGuesses = done(guesses.findByGuesserIdOrderByCreatedAtDesc(me.getId()));
        List<NousGuess> aboutMe = done(guesses.findByAuthorIdOrderByCreatedAtDesc(me.getId()));
        Set<String> guessed = myGuesses.stream().map(NousGuess::getQuestionId).collect(Collectors.toSet());
        int toGuess = (int) theirs.stream().filter(id -> !guessed.contains(id)).count();
        int toJudge = (int) aboutMe.stream().filter(g -> g.getVerdict() == null).count();
        NousDtos.Card daily = daily(all).map(q -> card(q, me, mine, marksOf())).orElse(null);
        NousDtos.ResetState reset = resets.findFirstByOrderByCreatedAtDesc().map(r -> new NousDtos.ResetState(
                r.getRequestedBy().getId().equals(me.getId()), r.getRequestedBy().getDisplayName(), r.getTheme(), r.getCreatedAt())).orElse(null);
        return new NousDtos.Overview(partner.map(User::getDisplayName).orElse(null), themes,
                (int) all.stream().filter(NousBank.Question::guessable).count(), mine.size(), theirs.size(), toGuess, toJudge,
                score(myGuesses, partner.map(p -> byQuestion(p.getId())).orElse(Map.of())), score(aboutMe, byQuestion(me.getId())), daily, reset);
    }

    /** How well we know each other, in all and theme by theme, and how often we answered the same. */
    @Transactional(readOnly = true)
    public NousDtos.Scores scores(String username) {
        User me = user(username);
        Optional<User> partner = partner(me);
        Map<String, NousAnswer> mine = byQuestion(me.getId());
        Map<String, NousAnswer> theirs = partner.map(p -> byQuestion(p.getId())).orElse(Map.of());
        List<NousGuess> myGuesses = done(guesses.findByGuesserIdOrderByCreatedAtDesc(me.getId()));
        List<NousGuess> aboutMe = done(guesses.findByAuthorIdOrderByCreatedAtDesc(me.getId()));
        List<NousDtos.ThemeScore> themes = NousBank.THEMES.stream().map(t -> {
            Set<String> ids = bank.all().stream().filter(q -> q.theme().equals(t.id()) && q.guessable())
                    .map(NousBank.Question::id).collect(Collectors.toSet());
            return new NousDtos.ThemeScore(t.id(),
                    score(myGuesses.stream().filter(g -> ids.contains(g.getQuestionId())).toList(), theirs),
                    score(aboutMe.stream().filter(g -> ids.contains(g.getQuestionId())).toList(), mine),
                    (int) mine.keySet().stream().filter(ids::contains).count(), (int) theirs.keySet().stream().filter(ids::contains).count(),
                    ids.size(), agreement(ids, mine, theirs, myGuesses));
        }).toList();
        Set<String> every = bank.all().stream().map(NousBank.Question::id).collect(Collectors.toSet());
        return new NousDtos.Scores(score(myGuesses, theirs), score(aboutMe, mine), agreement(every, mine, theirs, myGuesses), themes);
    }

    /**
     * My answers and theirs, side by side (the questions either of us
     * answered). Theirs stays locked until I have guessed it.
     */
    @Transactional(readOnly = true)
    public List<NousDtos.Compare> compare(String username, String theme) {
        User me = user(username);
        Optional<User> partner = partner(me);
        Map<String, NousAnswer> mine = byQuestion(me.getId());
        Map<String, NousAnswer> theirs = partner.map(p -> byQuestion(p.getId())).orElse(Map.of());
        Map<String, NousGuess> myGuesses = done(guesses.findByGuesserIdOrderByCreatedAtDesc(me.getId())).stream()
                .collect(Collectors.toMap(NousGuess::getQuestionId, Function.identity(), (a, b) -> a));
        Map<String, NousGuess> aboutMe = done(guesses.findByAuthorIdOrderByCreatedAtDesc(me.getId())).stream()
                .collect(Collectors.toMap(NousGuess::getQuestionId, Function.identity(), (a, b) -> a));
        return bank.all().stream().filter(NousBank.Question::guessable)
                .filter(q -> theme == null || theme.isBlank() || q.theme().equals(theme))
                .filter(q -> mine.containsKey(q.id()) || theirs.containsKey(q.id()))
                .map(q -> {
                    NousAnswer a = mine.get(q.id());
                    NousAnswer b = theirs.get(q.id());
                    NousGuess my = myGuesses.get(q.id());
                    NousGuess their = aboutMe.get(q.id());
                    boolean locked = b != null && my == null;
                    NousDtos.Said shownTheirs = b == null || locked ? null : said(q, b);
                    Boolean same = a != null && shownTheirs != null ? same(q, a, b) : null;
                    return new NousDtos.Compare(q.id(), q.theme(), q.kind(), q.text(), q.options(), a == null ? null : said(q, a),
                            shownTheirs, locked, same, my == null ? null : marked(my, q, b).verdict(),
                            their == null ? null : marked(their, q, a).verdict());
                }).toList();
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
                    NousDtos.Said said = a == null ? null : said(q, a);
                    return new NousDtos.Mine(q.id(), q.theme(), q.kind(), q.text(), q.options(),
                            said == null ? null : said.choices(), said == null ? null : said.text());
                }).toList();
    }

    @Transactional
    public void answer(String username, NousDtos.Answer request) {
        User me = user(username);
        NousBank.Question q = question(request == null ? null : request.id());
        if (!q.guessable()) {
            throw new ContentValidationException("Cette carte est juste pour en parler");
        }
        Integer choices = ticks(q, request.choices());
        String ranking = NousBank.RANK.equals(q.kind()) ? ranking(q, request.choices()) : null;
        String text = q.inWords() ? answerWords(q, request.text()) : null;
        NousAnswer a = answers.findByUserIdAndQuestionId(me.getId(), q.id()).orElseGet(() -> new NousAnswer(me, q.id()));
        if (a.set(choices, text, ranking, clock.instant())) {
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

    /** Starts my own answers again (a theme, or all of them): with them go the guesses about them, and mine about theirs. */
    @Transactional
    public void resetMine(String username, String theme) {
        User me = user(username);
        wipe(me, scope(theme == null || theme.isBlank() ? null : theme));
        events.publishEvent(new CoupleActivity(CoupleActivity.NOUS_RESET, me.getId(), me.getDisplayName(), "mine", null));
    }

    /** Proposes to start again for both of us: nothing goes until the other one says yes. */
    @Transactional
    public NousDtos.ResetState proposeReset(String username, NousDtos.ResetRequest request) {
        User me = user(username);
        String theme = request == null || request.theme() == null || request.theme().isBlank() ? null : request.theme();
        scope(theme);
        Optional<NousReset> pending = resets.findFirstByOrderByCreatedAtDesc();
        if (pending.isPresent() && !pending.get().getRequestedBy().getId().equals(me.getId())) {
            throw new ConflictException(pending.get().getRequestedBy().getDisplayName() + " t'a déjà proposé de repartir de zéro : réponds-lui d'abord");
        }
        pending.ifPresent(resets::delete);
        NousReset r = resets.save(new NousReset(me, theme, clock.instant()));
        events.publishEvent(new CoupleActivity(CoupleActivity.NOUS_RESET_ASK, me.getId(), me.getDisplayName(), themeLabel(theme), null));
        return new NousDtos.ResetState(true, me.getDisplayName(), r.getTheme(), r.getCreatedAt());
    }

    /** The other one's proposal: yes, and both of us start that theme (or all) again. */
    @Transactional
    public void acceptReset(String username) {
        User me = user(username);
        NousReset r = resets.findFirstByOrderByCreatedAtDesc()
                .orElseThrow(() -> new ResourceNotFoundException("Aucune remise à zéro en attente"));
        if (r.getRequestedBy().getId().equals(me.getId())) {
            throw new ConflictException("C'est à l'autre de dire oui");
        }
        Set<String> scope = scope(r.getTheme());
        wipe(me, scope);
        wipe(r.getRequestedBy(), scope);
        resets.delete(r);
        events.publishEvent(new CoupleActivity(CoupleActivity.NOUS_RESET, me.getId(), me.getDisplayName(), "accepted", null));
    }

    /** Takes back my proposal, or says no to the other one's. */
    @Transactional
    public void dropReset(String username) {
        User me = user(username);
        resets.findFirstByOrderByCreatedAtDesc().ifPresent(r -> {
            boolean mine = r.getRequestedBy().getId().equals(me.getId());
            resets.delete(r);
            events.publishEvent(new CoupleActivity(CoupleActivity.NOUS_RESET, me.getId(), me.getDisplayName(), mine ? "cancelled" : "refused", null));
        });
    }

    /** The other one's answered questions I haven't guessed yet (without their answers). */
    @Transactional(readOnly = true)
    public List<NousDtos.ToGuess> toGuess(String username) {
        User me = user(username);
        User partner = partner(me).orElseThrow(() -> new ConflictException("Personne à deviner pour l'instant"));
        List<NousGuess> mine = guesses.findByGuesserIdOrderByCreatedAtDesc(me.getId());
        Set<String> guessed = done(mine).stream().map(NousGuess::getQuestionId).collect(Collectors.toSet());
        Map<String, String> playing = mine.stream().filter(NousGuess::playing)
                .collect(Collectors.toMap(NousGuess::getQuestionId, NousGuess::getLetters, (a, b) -> a));
        Map<String, NousAnswer> theirs = byQuestion(partner.getId());
        return bank.all().stream().filter(q -> q.guessable() && theirs.containsKey(q.id()) && !guessed.contains(q.id()))
                .map(q -> {
                    boolean hangman = NousBank.HANGMAN.equals(q.kind()) && theirs.get(q.id()).getText() != null;
                    String tried = hangman ? playing.getOrDefault(q.id(), "") : null;
                    return new NousDtos.ToGuess(q.id(), q.theme(), q.kind(), q.text(), q.options(),
                            hangman ? Hangman.pattern(theirs.get(q.id()).getText(), tried) : null, tried);
                }).toList();
    }

    /** One guess: the answer is revealed at once; choices are judged, words wait for the other one's verdict. */
    @Transactional
    public NousDtos.Reveal guess(String username, NousDtos.Answer request) {
        User me = user(username);
        User partner = partner(me).orElseThrow(() -> new ConflictException("Personne à deviner pour l'instant"));
        NousBank.Question q = question(request == null ? null : request.id());
        NousAnswer theirs = answers.findByUserIdAndQuestionId(partner.getId(), q.id())
                .orElseThrow(() -> new ConflictException(partner.getDisplayName() + " n'a pas encore répondu à celle-ci"));
        if (NousBank.HANGMAN.equals(q.kind())) {
            throw new ConflictException("Celle-ci se joue au pendu, lettre par lettre");
        }
        if (guesses.findByGuesserIdAndQuestionId(me.getId(), q.id()).isPresent()) {
            throw new ConflictException("Déjà deviné");
        }
        Instant now = clock.instant();
        NousGuess g;
        if (NousBank.RANK.equals(q.kind())) {
            g = NousGuess.ranked(me, partner, q.id(), ranking(q, request.choices()), now);
        } else if (!q.inWords()) {
            g = new NousGuess(me, partner, q.id(), ticks(q, request.choices()), null, now);
        } else {
            int max = NousBank.SHORT.equals(q.kind()) ? MAX_SHORT : MAX_TEXT;
            g = new NousGuess(me, partner, q.id(), null, words(request.text(), max), now);
        }
        if (!q.inWords()) {
            g.judge(marked(g, q, theirs).verdict(), null, now);
        } else if (NousBank.SHORT.equals(q.kind()) && theirs.getText() != null && Hangman.fold(g.getText()).equals(Hangman.fold(theirs.getText()))) {
            // The same word: no need to ask.
            g.judge(NousGuess.RIGHT, null, now);
        }
        g = guesses.save(g);
        if (g.getVerdict() == null) {
            events.publishEvent(new CoupleActivity(CoupleActivity.NOUS_GUESS, me.getId(), me.getDisplayName(), null, g.getId()));
        }
        return reveal(g, q, theirs);
    }

    /** One letter of a hangman: the word as found so far, and the reveal once it is found or the hangman is complete. */
    @Transactional
    public NousDtos.HangmanState letter(String username, NousDtos.Letter request) {
        User me = user(username);
        User partner = partner(me).orElseThrow(() -> new ConflictException("Personne à deviner pour l'instant"));
        NousBank.Question q = question(request == null ? null : request.id());
        if (!NousBank.HANGMAN.equals(q.kind())) {
            throw new ContentValidationException("Celle-ci ne se joue pas au pendu");
        }
        char c = Hangman.letter(request.letter());
        if (c == 0) {
            throw new ContentValidationException("Une lettre, de A à Z");
        }
        NousAnswer theirs = answers.findByUserIdAndQuestionId(partner.getId(), q.id())
                .filter(a -> a.getText() != null)
                .orElseThrow(() -> new ConflictException(partner.getDisplayName() + " n'a pas encore répondu à celle-ci"));
        String word = theirs.getText();
        Instant now = clock.instant();
        NousGuess g = guesses.findByGuesserIdAndQuestionId(me.getId(), q.id())
                .orElseGet(() -> NousGuess.hangman(me, partner, q.id(), now));
        if (!g.playing()) {
            throw new ConflictException("Déjà deviné");
        }
        if (g.getLetters().indexOf(c) < 0) {
            g.tryLetter(c);
        }
        int errors = Hangman.errors(word, g.getLetters());
        if (Hangman.found(word, g.getLetters())) {
            g.judge(errors <= 2 ? NousGuess.RIGHT : NousGuess.CLOSE, null, now);
        } else if (errors >= Hangman.MAX_ERRORS) {
            g.judge(NousGuess.WRONG, null, now);
        }
        g = guesses.save(g);
        return new NousDtos.HangmanState(q.id(), Hangman.pattern(word, g.getLetters()), g.getLetters(), errors, Hangman.MAX_ERRORS,
                g.playing() ? null : reveal(g, q, theirs));
    }

    @Transactional(readOnly = true)
    public NousDtos.History history(String username) {
        User me = user(username);
        User partner = partner(me).orElse(null);
        Map<String, NousAnswer> mine = byQuestion(me.getId());
        Map<String, NousAnswer> theirs = partner == null ? Map.of() : byQuestion(partner.getId());
        return new NousDtos.History(reveals(done(guesses.findByGuesserIdOrderByCreatedAtDesc(me.getId())), theirs),
                reveals(done(guesses.findByAuthorIdOrderByCreatedAtDesc(me.getId())), mine));
    }

    /** My verdict on a guess about me (in words): right, close or wrong, with a little note. */
    @Transactional
    public NousDtos.Reveal judge(String username, long guessId, NousDtos.Judge request) {
        User me = user(username);
        NousGuess g = guesses.findById(guessId).filter(x -> x.getAuthor().getId().equals(me.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Devinette introuvable"));
        NousBank.Question q = question(g.getQuestionId());
        if (!q.inWords() || NousBank.HANGMAN.equals(q.kind())) {
            throw new ConflictException("Celle-ci se corrige toute seule");
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
        Marked m = marked(g, q, answer);
        NousDtos.Said a = answer == null ? null : said(q, answer);
        return new NousDtos.Reveal(g.getId() == null ? 0 : g.getId(), q.id(), q.theme(), q.kind(), q.text(), q.options(),
                g.getRanking() != null ? order(g.getRanking()) : list(g.getChoices()), g.getText(),
                a == null ? null : a.choices(), a == null ? null : a.text(),
                m.verdict(), g.getNote(), g.getCreatedAt(), m.points(), m.common(), m.union(), g.getLetters(),
                g.getLetters() != null && answer != null && answer.getText() != null ? Hangman.errors(answer.getText(), g.getLetters()) : null);
    }

    /** How a guess scored: its verdict and points (null while waiting for a verdict in words). */
    record Marked(String verdict, Integer points, Integer common, Integer union) {
    }

    /**
     * What is answered with a tap is scored from the answers themselves (so
     * every guess follows the same rule): ticked choices by ticks in common ÷
     * ticks in all; one choice right or wrong; a scale 100 less 20 a step
     * apart; a ranking by the options well placed. A hangman found loses 10 an
     * error (40 at least). Words by their verdict.
     */
    static Marked marked(NousGuess g, NousBank.Question q, NousAnswer answer) {
        boolean both = answer != null && g.getChoices() != null && answer.getChoices() != null;
        if (NousBank.CHOICE.equals(q.kind()) && both) {
            int common = Integer.bitCount(g.getChoices() & answer.getChoices());
            int union = Integer.bitCount(g.getChoices() | answer.getChoices());
            int points = union == 0 ? 0 : Math.round(100f * common / union);
            return new Marked(verdict(g.getChoices(), answer.getChoices()), points, common, union);
        }
        if (NousBank.ONE.equals(q.kind()) && both) {
            boolean right = g.getChoices().equals(answer.getChoices());
            return new Marked(right ? NousGuess.RIGHT : NousGuess.WRONG, right ? 100 : 0, null, null);
        }
        if (NousBank.SCALE.equals(q.kind()) && both) {
            int apart = Math.abs(Integer.numberOfTrailingZeros(g.getChoices()) - Integer.numberOfTrailingZeros(answer.getChoices()));
            String v = apart == 0 ? NousGuess.RIGHT : apart <= 2 ? NousGuess.CLOSE : apart <= 4 ? NousGuess.SOME : NousGuess.WRONG;
            return new Marked(v, Math.max(0, 100 - 20 * apart), null, null);
        }
        if (NousBank.RANK.equals(q.kind()) && answer != null && g.getRanking() != null && answer.getRanking() != null) {
            List<Integer> guessed = order(g.getRanking());
            List<Integer> real = order(answer.getRanking());
            int n = real.size();
            int placed = 0;
            for (int i = 0; i < Math.min(n, guessed.size()); i++) {
                placed += guessed.get(i).equals(real.get(i)) ? 1 : 0;
            }
            String v = placed == n ? NousGuess.RIGHT : 2 * placed >= n ? NousGuess.CLOSE : placed > 0 ? NousGuess.SOME : NousGuess.WRONG;
            return new Marked(v, n == 0 ? 0 : Math.round(100f * placed / n), placed, n);
        }
        if (NousBank.HANGMAN.equals(q.kind()) && g.getLetters() != null) {
            if (g.getVerdict() == null || answer == null || answer.getText() == null) {
                return new Marked(g.getVerdict(), null, null, null);
            }
            int errors = Hangman.errors(answer.getText(), g.getLetters());
            boolean found = !NousGuess.WRONG.equals(g.getVerdict());
            return new Marked(g.getVerdict(), found ? Math.max(40, 100 - 10 * errors) : 0, null, null);
        }
        String v = g.getVerdict();
        Integer points = v == null ? null : NousGuess.RIGHT.equals(v) ? 100 : NousGuess.CLOSE.equals(v) ? 50 : 0;
        return new Marked(v, points, null, null);
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

    /** Counts by verdict, and the average points of the judged guesses ({@code answersOf}: the author's answers). */
    private NousDtos.Score score(List<NousGuess> list, Map<String, NousAnswer> answersOf) {
        int right = 0;
        int close = 0;
        int some = 0;
        int wrong = 0;
        int pending = 0;
        int total = 0;
        for (NousGuess g : list) {
            Optional<NousBank.Question> q = bank.question(g.getQuestionId());
            if (q.isEmpty()) {
                continue;
            }
            Marked m = marked(g, q.get(), answersOf.get(g.getQuestionId()));
            if (m.verdict() == null || m.points() == null) {
                pending++;
                continue;
            }
            total += m.points();
            switch (m.verdict()) {
                case NousGuess.RIGHT -> right++;
                case NousGuess.CLOSE -> close++;
                case NousGuess.SOME -> some++;
                default -> wrong++;
            }
        }
        int judged = right + close + some + wrong;
        return new NousDtos.Score(right, close, some, wrong, pending, judged == 0 ? null : Math.round((float) total / judged));
    }

    /** Answers alike among the questions of {@code ids} both of us answered and whose answer of theirs I know (I guessed it). */
    private NousDtos.Agreement agreement(Set<String> ids, Map<String, NousAnswer> mine, Map<String, NousAnswer> theirs, List<NousGuess> myGuesses) {
        Set<String> known = myGuesses.stream().map(NousGuess::getQuestionId).collect(Collectors.toSet());
        int same = 0;
        int compared = 0;
        for (String id : ids) {
            NousAnswer a = mine.get(id);
            NousAnswer b = theirs.get(id);
            Optional<NousBank.Question> q = bank.question(id);
            if (a == null || b == null || !known.contains(id) || q.isEmpty()) {
                continue;
            }
            compared++;
            same += same(q.get(), a, b) ? 1 : 0;
        }
        return new NousDtos.Agreement(same, compared, compared == 0 ? null : Math.round(100f * same / compared));
    }

    /** Two answers to the same question are alike: the same ticks, point or order, or the same words (accents and case aside). */
    static boolean same(NousBank.Question q, NousAnswer a, NousAnswer b) {
        if (NousBank.RANK.equals(q.kind())) {
            return a.getRanking() != null && a.getRanking().equals(b.getRanking());
        }
        if (q.inWords()) {
            return a.getText() != null && b.getText() != null && Hangman.fold(a.getText()).equals(Hangman.fold(b.getText()));
        }
        return a.getChoices() != null && a.getChoices().equals(b.getChoices());
    }

    /** An answer as shown: the order of a ranking, the options ticked (or the point of a scale), or the words. */
    private static NousDtos.Said said(NousBank.Question q, NousAnswer a) {
        if (NousBank.RANK.equals(q.kind())) {
            return new NousDtos.Said(a.getRanking() == null ? null : order(a.getRanking()), null);
        }
        return new NousDtos.Said(list(a.getChoices()), a.getText());
    }

    /** Guesses that are over (a hangman still being played isn't). */
    private static List<NousGuess> done(List<NousGuess> list) {
        return list.stream().filter(g -> !g.playing()).toList();
    }

    /** The questions a reset covers: a theme's, or null for all of them. */
    private Set<String> scope(String theme) {
        if (theme != null && NousBank.theme(theme).isEmpty()) {
            throw new ContentValidationException("Catégorie inconnue");
        }
        return theme == null ? null : bank.all().stream().filter(q -> q.theme().equals(theme)).map(NousBank.Question::id)
                .collect(Collectors.toCollection(HashSet::new));
    }

    /** Someone's answers, the guesses about them and theirs about the other one ({@code scope} null: everything). */
    private void wipe(User who, Set<String> scope) {
        if (scope == null) {
            answers.deleteByUserId(who.getId());
            guesses.deleteByAuthorId(who.getId());
            guesses.deleteByGuesserId(who.getId());
        } else if (!scope.isEmpty()) {
            answers.deleteByUserIdAndQuestionIdIn(who.getId(), scope);
            guesses.deleteByAuthorIdAndQuestionIdIn(who.getId(), scope);
            guesses.deleteByGuesserIdAndQuestionIdIn(who.getId(), scope);
        }
    }

    private static String themeLabel(String theme) {
        return theme == null ? null : NousBank.theme(theme).map(t -> t.emoji() + " " + t.label()).orElse(null);
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

    /**
     * The options answered with a tap, as a bit set: ticked choices (at least
     * one), a single choice, or a point on a scale (0 to 10). Null for the
     * other kinds.
     */
    static Integer ticks(NousBank.Question q, List<Integer> choices) {
        return switch (q.kind()) {
            case NousBank.CHOICE -> mask(q, choices);
            case NousBank.ONE -> one(choices, q.options().size() - 1);
            case NousBank.SCALE -> one(choices, NousBank.SCALE_MAX);
            default -> null;
        };
    }

    private static int one(List<Integer> choices, int max) {
        if (choices == null || choices.size() != 1 || choices.get(0) == null || choices.get(0) < 0 || choices.get(0) > max) {
            throw new ContentValidationException("Choisis une seule réponse");
        }
        return 1 << choices.get(0);
    }

    /** A ranking: every option once, first to last ("2,0,3,1"). */
    static String ranking(NousBank.Question q, List<Integer> order) {
        int n = q.options().size();
        if (order == null || order.size() != n || new HashSet<>(order).size() != n
                || order.stream().anyMatch(i -> i == null || i < 0 || i >= n)) {
            throw new ContentValidationException("Range toutes les propositions, de la première à la dernière");
        }
        return order.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private static List<Integer> order(String ranking) {
        List<Integer> out = new ArrayList<>();
        for (String s : ranking.split(",")) {
            out.add(Integer.parseInt(s.strip()));
        }
        return out;
    }

    /** An answer in words: a playable word for a hangman, a few words for a short answer, else up to 280 characters. */
    private static String answerWords(NousBank.Question q, String text) {
        if (NousBank.HANGMAN.equals(q.kind())) {
            String w = text == null ? "" : text.strip().replaceAll("\\s+", " ");
            if (!Hangman.playable(w)) {
                throw new ContentValidationException("Un mot (ou deux) de 2 à 20 lettres, sans chiffres ni symboles");
            }
            return w;
        }
        return words(text, NousBank.SHORT.equals(q.kind()) ? MAX_SHORT : MAX_TEXT);
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

    /**
     * Ticks in common ÷ ticks in all (by either of us): all of them right,
     * half or more close, some under half, none wrong.
     */
    static String verdict(int guessed, Integer answer) {
        int a = answer == null ? 0 : answer;
        int common = Integer.bitCount(guessed & a);
        int union = Integer.bitCount(guessed | a);
        if (union > 0 && common == union) {
            return NousGuess.RIGHT;
        }
        if (common == 0) {
            return NousGuess.WRONG;
        }
        return 2 * common >= union ? NousGuess.CLOSE : NousGuess.SOME;
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
