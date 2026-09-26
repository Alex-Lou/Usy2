package com.memocat.quiz;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.CoupleActivity;
import com.memocat.domain.QuizChallenge;
import com.memocat.domain.User;
import com.memocat.quiz.dto.QuizDtos;
import com.memocat.repository.QuizChallengeRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Quiz "défis à tour de rôle": I play ten questions (a level of mine or a
 * surprise mix), and once I'm done the other person is told and gets the very
 * same questions, answers in the same order. Nothing is kept if I give up
 * halfway; the other person's answers are saved one by one, so a closed app
 * picks up at the next question (never one already seen). Duels don't count
 * towards stars or levels.
 */
@Service
public class QuizChallengeService {

    public static final String MIX = "mix";
    static final int MIX_MAX_LEVEL = 3;
    static final int MAX_OPEN = 5;
    private static final QuizBank.Theme MIX_THEME = new QuizBank.Theme(MIX, "Mélange surprise", "🎲", "#7c6cf0");

    /** A question as stored with its duel (short keys: the right answer never leaves the server early). */
    public record Stored(String t, List<String> o, int c) {
    }

    private final QuizService quiz;
    private final QuizChallengeRepository challenges;
    private final UserRepository users;
    private final ApplicationEventPublisher events;
    private final ObjectMapper json;
    private final Clock clock;

    @Autowired
    public QuizChallengeService(QuizService quiz, QuizChallengeRepository challenges, UserRepository users,
                                ApplicationEventPublisher events, ObjectMapper json) {
        this(quiz, challenges, users, events, json, Clock.systemUTC());
    }

    QuizChallengeService(QuizService quiz, QuizChallengeRepository challenges, UserRepository users,
                         ApplicationEventPublisher events, ObjectMapper json, Clock clock) {
        this.quiz = quiz;
        this.challenges = challenges;
        this.users = users;
        this.events = events;
        this.json = json;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public QuizDtos.Challenges list(String username) {
        User me = quiz.user(username);
        int wins = 0;
        int losses = 0;
        int ties = 0;
        for (Object[] row : challenges.finishedScores(me.getId())) {
            boolean iSent = me.getId().equals(row[0]);
            int mine = ((Number) (iSent ? row[1] : row[2])).intValue();
            int theirs = ((Number) (iSent ? row[2] : row[1])).intValue();
            if (mine > theirs) {
                wins++;
            } else if (mine < theirs) {
                losses++;
            } else {
                ties++;
            }
        }
        List<QuizDtos.Challenge> items = challenges.findTop30ByFromUserIdOrToUserIdOrderByCreatedAtDesc(me.getId(), me.getId())
                .stream().map(c -> dto(me, c)).toList();
        return new QuizDtos.Challenges(quiz.partner(me).map(User::getDisplayName).orElse(null), wins, losses, ties,
                (int) challenges.countByFromUserIdAndFinishedAtIsNull(me.getId()), MAX_OPEN, items);
    }

    /** Starts my side of a new duel: the questions are fixed now, the duel is only saved when I finish. */
    @Transactional(readOnly = true)
    public QuizDtos.Run create(String username, QuizDtos.Start request) {
        User me = quiz.user(username);
        User partner = quiz.partner(me).orElseThrow(() -> new ConflictException("Personne à défier pour l'instant"));
        if (challenges.countByFromUserIdAndFinishedAtIsNull(me.getId()) >= MAX_OPEN) {
            throw new ConflictException(partner.getDisplayName() + " a déjà " + MAX_OPEN + " défis à relever : attends un peu");
        }
        String theme = request == null ? null : request.theme();
        boolean mix = MIX.equals(theme);
        int level = mix ? 0 : request == null || request.level() == null ? 0 : request.level();
        List<QuizService.Item> items = mix ? quiz.mixItems(MIX_MAX_LEVEL) : quiz.levelItems(me, theme, level);
        if (items.isEmpty()) {
            throw new ConflictException("Pas de questions ici pour l'instant");
        }
        Long meId = me.getId();
        Long partnerId = partner.getId();
        String stored = write(items);
        QuizService.RunListener listener = new QuizService.RunListener() {
            @Override
            public void answered(String marks, int score) {
                // Nothing kept until the end: giving up halfway sends no duel.
            }

            @Override
            public QuizDtos.Result finished(String marks, int score, int correct, int total) {
                User from = users.getReferenceById(meId);
                QuizChallenge c = challenges.save(new QuizChallenge(from, users.getReferenceById(partnerId), theme, level,
                        stored, score, marks, clock.instant()));
                events.publishEvent(new CoupleActivity(CoupleActivity.QUIZ_CHALLENGE, meId, me.getDisplayName(), label(theme, level), c.getId()));
                return result(score, correct, total, c.getId(), false);
            }
        };
        return quiz.startWith(me, theme, level, items, "", 0, listener, "new:" + UUID.randomUUID());
    }

    /** Plays (or picks up) a duel sent to me. */
    @Transactional
    public QuizDtos.Run play(String username, long id) {
        User me = quiz.user(username);
        QuizChallenge c = challenges.findById(id)
                .filter(x -> x.getToUser().getId().equals(me.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Défi introuvable"));
        if (c.isFinished()) {
            throw new ConflictException("Défi déjà relevé");
        }
        c.start(clock.instant());
        List<QuizService.Item> items = read(c.getItems()).stream()
                .map(s -> new QuizService.Item(s.t(), s.o(), s.c(), null)).toList();
        Long challengeId = c.getId();
        Long meId = me.getId();
        String myName = me.getDisplayName();
        QuizService.RunListener listener = new QuizService.RunListener() {
            @Override
            public void answered(String marks, int score) {
                challenges.findById(challengeId).ifPresent(x -> x.progress(marks, score));
            }

            @Override
            public QuizDtos.Result finished(String marks, int score, int correct, int total) {
                QuizChallenge x = challenges.findById(challengeId).orElseThrow(() -> new ResourceNotFoundException("Défi introuvable"));
                x.progress(marks, score);
                x.finish(clock.instant());
                events.publishEvent(new CoupleActivity(CoupleActivity.QUIZ_DONE, meId, myName, label(x.getTheme(), x.getLevel()), challengeId));
                return result(score, correct, total, challengeId, true);
            }
        };
        return quiz.startWith(me, c.getTheme(), c.getLevel(), items, c.getToMarks(), c.getToScore(), listener, "duel:" + challengeId);
    }

    /** A finished duel, question by question. */
    @Transactional(readOnly = true)
    public QuizDtos.Duel duel(String username, long id) {
        User me = quiz.user(username);
        QuizChallenge c = challenges.findById(id)
                .filter(x -> x.getFromUser().getId().equals(me.getId()) || x.getToUser().getId().equals(me.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Défi introuvable"));
        if (!c.isFinished()) {
            throw new ConflictException("Le défi n'est pas encore relevé");
        }
        boolean iSent = c.getFromUser().getId().equals(me.getId());
        String mine = iSent ? c.getFromMarks() : c.getToMarks();
        String theirs = iSent ? c.getToMarks() : c.getFromMarks();
        List<Stored> stored = read(c.getItems());
        List<QuizDtos.DuelLine> lines = new ArrayList<>();
        for (int i = 0; i < stored.size(); i++) {
            Stored s = stored.get(i);
            lines.add(new QuizDtos.DuelLine(s.t(), s.o(), s.c(), mark(mine, i), mark(theirs, i)));
        }
        User other = iSent ? c.getToUser() : c.getFromUser();
        return new QuizDtos.Duel(dto(me, c), me.getDisplayName(), other.getDisplayName(), lines);
    }

    private QuizDtos.Challenge dto(User me, QuizChallenge c) {
        boolean iSent = c.getFromUser().getId().equals(me.getId());
        QuizBank.Theme t = theme(c.getTheme());
        int total = read(c.getItems()).size();
        String status = c.isFinished() ? "done" : iSent ? "wait" : "play";
        Integer myScore = iSent ? Integer.valueOf(c.getFromScore()) : c.isFinished() ? Integer.valueOf(c.getToScore()) : null;
        Integer theirScore = iSent ? (c.isFinished() ? Integer.valueOf(c.getToScore()) : null) : Integer.valueOf(c.getFromScore());
        String outcome = null;
        if (c.isFinished()) {
            int cmp = Integer.compare(Objects.requireNonNull(myScore), Objects.requireNonNull(theirScore));
            outcome = cmp > 0 ? "win" : cmp < 0 ? "lose" : "tie";
        }
        return new QuizDtos.Challenge(c.getId(), t.id(), t.label(), t.emoji(), t.color(), c.getLevel(),
                c.getFromUser().getDisplayName(), iSent, status, myScore, theirScore, c.getToMarks().length(), total,
                outcome, c.getCreatedAt());
    }

    private static QuizDtos.Result result(int score, int correct, int total, Long challengeId, boolean done) {
        return new QuizDtos.Result(score, correct, total, QuizService.stars(correct, total), score, false, false, challengeId, done);
    }

    private static boolean mark(String marks, int i) {
        return i < marks.length() && marks.charAt(i) == '1';
    }

    private static QuizBank.Theme theme(String id) {
        return MIX.equals(id) ? MIX_THEME : QuizBank.theme(id).orElse(MIX_THEME);
    }

    private static String label(String theme, int level) {
        QuizBank.Theme t = theme(theme);
        return t.emoji() + " " + t.label() + (level > 0 ? " · niveau " + level : "");
    }

    private String write(List<QuizService.Item> items) {
        try {
            return json.writeValueAsString(items.stream().map(i -> new Stored(i.text(), i.options(), i.correct())).toList());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Quiz: duel not serialisable", e);
        }
    }

    private List<Stored> read(String items) {
        try {
            return json.readValue(items, new TypeReference<List<Stored>>() {
            });
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Quiz: stored duel unreadable", e);
        }
    }
}
