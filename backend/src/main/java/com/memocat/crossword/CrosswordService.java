package com.memocat.crossword;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.CoupleActivity;
import com.memocat.crossword.CrosswordDtos.CellDto;
import com.memocat.crossword.CrosswordDtos.Change;
import com.memocat.crossword.CrosswordDtos.DailyDto;
import com.memocat.crossword.CrosswordDtos.GameDto;
import com.memocat.crossword.CrosswordDtos.PingDto;
import com.memocat.crossword.CrosswordDtos.SummaryDto;
import com.memocat.domain.CrosswordGame;
import com.memocat.domain.User;
import com.memocat.repository.CrosswordGameRepository;
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

import java.text.Normalizer;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** ✏️ Mots fléchés: a new grid from the word list, played alone or together, saved as you type. */
@Service
public class CrosswordService {

    /** The three sizes: columns × rows, and how many full grids are made to keep the best (big ones cost more). */
    enum Size {
        PETITE(7, 8, 4), MOYENNE(9, 11, 2), GRANDE(9, 13, 1);

        final int width;
        final int height;
        final int attempts;

        Size(int width, int height, int attempts) {
            this.width = width;
            this.height = height;
            this.attempts = attempts;
        }
    }

    /** How hard the grid is: which words it uses, and which of their two clues. */
    enum Level {
        /** Common words, direct clues. */
        FACILE(1, 0.0),
        /** Less common words too; a third of the clues are the tricky ones. */
        MOYEN(2, 0.35),
        /** Every word, tricky clues (puns, double meanings, ___ to complete). */
        DIFFICILE(3, 1.0);

        final int maxWordLevel;
        final double hardClues;

        Level(int maxWordLevel, double hardClues) {
            this.maxWordLevel = maxWordLevel;
            this.hardClues = hardClues;
        }
    }

    /** In a theme grid the words longer than this all come from the theme; shorter ones hold the grid together. */
    static final int THEME_GLUE_LENGTH = 4;

    /** The grid of the day changes at midnight, Paris time. */
    static final ZoneId HOME = ZoneId.of("Europe/Paris");
    /** The grid of the day: medium, every theme; easy early in the week, hard at the weekend. */
    static final Size DAILY_SIZE = Size.MOYENNE;

    /**
     * A mixed grid (and the grid of the day) leaves out the long words of the last grids made, so that
     * day after day the grids do not keep bringing back the same ones; short words hold every grid
     * together and stay. The last grids: see {@link CrosswordGameRepository#findTop12ByOrderByCreatedAtDesc}.
     */
    static final int FRESH_LENGTH = 5;

    static final int MAX_CHANGES = 60;
    static final int LIST_SIZE = 30;

    private final CrosswordGameRepository games;
    private final UserRepository users;
    private final ArrowWords words;
    private final ObjectMapper json;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final Random random;
    /** The dictionary by word, to show each grid's clues as they are worded today. */
    private final Map<String, ArrowWords.Word> byWord;

    @Autowired
    public CrosswordService(CrosswordGameRepository games, UserRepository users, ArrowWords words, ObjectMapper json,
                            ApplicationEventPublisher events) {
        this(games, users, words, json, events, Clock.systemUTC(), new Random());
    }

    CrosswordService(CrosswordGameRepository games, UserRepository users, ArrowWords words, ObjectMapper json,
                     ApplicationEventPublisher events, Clock clock, Random random) {
        this.games = games;
        this.users = users;
        this.words = words;
        this.json = json;
        this.events = events;
        this.clock = clock;
        this.random = random;
        this.byWord = words.words().stream().collect(Collectors.toMap(ArrowWords.Word::word, Function.identity()));
    }

    @Transactional
    public GameDto create(String username, String size, boolean shared, String theme, String level) {
        User me = requireUser(username);
        Size s = parseSize(size);
        String t = parseTheme(theme);
        Level l = parseLevel(level);
        ArrowGrid grid = new ArrowGenerator(entries(t, l, recentWords())).generate(s.width, s.height, random, s.attempts);
        CrosswordGame game = games.save(new CrosswordGame(me, s.name().toLowerCase(Locale.ROOT), t,
                l.name().toLowerCase(Locale.ROOT), shared, grid.width(), grid.height(), toJson(grid.clues()),
                grid.solution(), clock.instant()));
        if (shared) {
            events.publishEvent(CoupleActivity.of(CoupleActivity.CROSSWORD, me, game.getSize(), game.getId()));
        }
        return toDto(game);
    }

    /** Today's grid and our streak (nothing is created by looking). */
    @Transactional(readOnly = true)
    public DailyDto daily(String username) {
        requireUser(username);
        LocalDate today = today();
        CrosswordGame game = games.findByDailyDate(today).orElse(null);
        boolean finished = game != null && game.getFinishedAt() != null;
        return new DailyDto(today, dailyLevel(today).name().toLowerCase(Locale.ROOT), game == null ? null : game.getId(),
                game == null ? 0 : progress(game), finished, streak(today, finished));
    }

    /**
     * Opens today's grid: the one already there, or a new one shared with the other (who is told).
     * Both at the same second: the unique day makes the second insert fail; see the controller.
     */
    @Transactional
    public GameDto playDaily(String username) {
        User me = requireUser(username);
        LocalDate today = today();
        Optional<CrosswordGame> existing = games.findByDailyDate(today);
        if (existing.isPresent()) return toDto(existing.get());
        Level l = dailyLevel(today);
        ArrowGrid grid = new ArrowGenerator(entries("melange", l, recentWords())).generate(DAILY_SIZE.width, DAILY_SIZE.height, random,
                DAILY_SIZE.attempts);
        CrosswordGame game = new CrosswordGame(me, DAILY_SIZE.name().toLowerCase(Locale.ROOT), "melange",
                l.name().toLowerCase(Locale.ROOT), true, grid.width(), grid.height(), toJson(grid.clues()), grid.solution(),
                clock.instant());
        game.markDaily(today);
        game = games.saveAndFlush(game);
        events.publishEvent(CoupleActivity.of(CoupleActivity.CROSSWORD, me, "du jour", game.getId()));
        return toDto(game);
    }

    static Level dailyLevel(LocalDate day) {
        DayOfWeek d = day.getDayOfWeek();
        if (d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY) return Level.DIFFICILE;
        return d == DayOfWeek.MONDAY || d == DayOfWeek.TUESDAY ? Level.FACILE : Level.MOYEN;
    }

    /** Days in a row with the grid of the day finished, up to today (or yesterday while today's is not done). */
    private int streak(LocalDate today, boolean todayDone) {
        LocalDate day = todayDone ? today : today.minusDays(1);
        int streak = 0;
        for (LocalDate done : games.findFinishedDays(today.minusDays(366))) {
            if (done.isAfter(day)) continue;
            if (!done.equals(day)) break;
            streak++;
            day = day.minusDays(1);
        }
        return streak;
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(HOME));
    }

    List<ArrowGenerator.Entry> entries(String theme, Level level) {
        return entries(theme, level, Set.of());
    }

    /**
     * The words a grid may use, with the clue it shows; in a theme grid, every long word is a theme word.
     * {@code recent}: words of the last grids, left out of a mixed grid when long (a theme has too few
     * words to spare any).
     */
    List<ArrowGenerator.Entry> entries(String theme, Level level, Set<String> recent) {
        boolean anyTheme = theme.equals("melange");
        return words.words().stream()
                .filter(w -> w.level() <= level.maxWordLevel)
                .filter(w -> !anyTheme || w.word().length() < FRESH_LENGTH || !recent.contains(w.word()))
                .filter(w -> anyTheme || w.word().length() <= THEME_GLUE_LENGTH || w.themes().contains(theme))
                .map(w -> new ArrowGenerator.Entry(w.word(),
                        random.nextDouble() < level.hardClues ? w.hard() : w.easy(),
                        !anyTheme && w.themes().contains(theme)))
                .toList();
    }

    /** The words of the last grids made (by either of us). */
    private Set<String> recentWords() {
        Set<String> out = new HashSet<>();
        for (CrosswordGame g : games.findTop12ByOrderByCreatedAtDesc()) {
            for (ArrowGrid.Clue c : fromJson(g.getClues())) out.add(answer(g.getSolution(), g.getWidth(), c));
        }
        return out;
    }

    static String answer(String solution, int width, ArrowGrid.Clue c) {
        int step = c.dir().equals("down") ? width : 1;
        StringBuilder sb = new StringBuilder(c.length());
        for (int k = 0; k < c.length(); k++) sb.append(solution.charAt(c.start() + k * step));
        return sb.toString();
    }

    @Transactional(readOnly = true)
    public List<SummaryDto> list(String username) {
        User me = requireUser(username);
        return games.findVisibleTo(me.getId(), PageRequest.of(0, LIST_SIZE)).stream()
                .map(g -> new SummaryDto(g.getId(), g.getSize(), g.getTheme(), g.getLevel(), g.isShared(), g.getOwner().getDisplayName(),
                        g.getOwner().getId().equals(me.getId()), progress(g), g.getCreatedAt(), g.getUpdatedAt(),
                        g.getFinishedAt(), g.getDailyDate()))
                .toList();
    }

    @Transactional(readOnly = true)
    public GameDto get(String username, Long id) {
        User me = requireUser(username);
        return toDto(visible(games.findById(id), me));
    }

    /** Writes letters (or reveals them); returns what changed, for the other player. */
    @Transactional
    public PingDto play(String username, Long id, List<Change> changes) {
        User me = requireUser(username);
        CrosswordGame game = visible(games.findForUpdate(id), me);
        if (game.getFinishedAt() != null) throw new ConflictException("Cette grille est déjà terminée");
        if (changes == null || changes.isEmpty()) return new PingDto(id, game.isShared(), me.getId(), List.of(), null);
        if (changes.size() > MAX_CHANGES) throw new ContentValidationException("Trop de cases à la fois");

        char mark = game.getOwner().getId().equals(me.getId()) ? 'a' : 'b';
        String solution = game.getSolution();
        char[] letters = game.getLetters().toCharArray();
        char[] authors = game.getAuthors().toCharArray();
        List<CellDto> applied = new ArrayList<>();
        for (Change c : changes) {
            int cell = c.cell();
            if (cell < 0 || cell >= solution.length() || solution.charAt(cell) == ArrowGrid.BLOCK) {
                throw new ContentValidationException("Case invalide");
            }
            if (authors[cell] == '*') continue; // a revealed letter stays
            if (c.reveal()) {
                letters[cell] = solution.charAt(cell);
                authors[cell] = '*';
            } else {
                char letter = parseLetter(c.letter());
                letters[cell] = letter;
                authors[cell] = letter == '.' ? '.' : mark;
            }
            applied.add(new CellDto(cell, letters[cell] == '.' ? "" : String.valueOf(letters[cell]), authors[cell]));
        }
        boolean wasOpen = game.getFinishedAt() == null;
        game.write(new String(letters), new String(authors), clock.instant());
        if (wasOpen && game.getFinishedAt() != null && game.isShared()) {
            events.publishEvent(CoupleActivity.of(CoupleActivity.CROSSWORD_DONE, me, game.getSize(), game.getId()));
        }
        return new PingDto(id, game.isShared(), me.getId(), applied, game.getFinishedAt());
    }

    /**
     * Starts the grid over: every letter goes, revealed ones too (a shared grid restarts for both of
     * us; the other one sees it live). A finished grid stays as it is: its time and stars are kept.
     */
    @Transactional
    public PingDto restart(String username, Long id) {
        User me = requireUser(username);
        CrosswordGame game = visible(games.findForUpdate(id), me);
        if (game.getFinishedAt() != null) throw new ConflictException("Cette grille est déjà terminée");
        String solution = game.getSolution();
        StringBuilder empty = new StringBuilder(solution.length());
        List<CellDto> cleared = new ArrayList<>();
        for (int cell = 0; cell < solution.length(); cell++) {
            boolean letter = solution.charAt(cell) != ArrowGrid.BLOCK;
            empty.append(letter ? '.' : ArrowGrid.BLOCK);
            if (letter && game.getLetters().charAt(cell) != '.') cleared.add(new CellDto(cell, "", '.'));
        }
        game.write(empty.toString(), empty.toString(), clock.instant());
        return new PingDto(id, game.isShared(), me.getId(), cleared, null);
    }

    @Transactional
    public void delete(String username, Long id) {
        User me = requireUser(username);
        CrosswordGame game = visible(games.findById(id), me);
        if (!game.getOwner().getId().equals(me.getId())) {
            throw new ForbiddenException("Seul celui qui a lancé la grille peut la supprimer");
        }
        games.delete(game);
    }

    /** One letter A-Z (accents dropped), or '.' for an empty cell. */
    static char parseLetter(String raw) {
        if (raw == null || raw.isBlank()) return '.';
        String plain = Normalizer.normalize(raw.strip(), Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT);
        if (plain.length() != 1 || plain.charAt(0) < 'A' || plain.charAt(0) > 'Z') {
            throw new ContentValidationException("Une seule lettre par case");
        }
        return plain.charAt(0);
    }

    static Size parseSize(String raw) {
        try {
            return Size.valueOf((raw == null ? "petite" : raw).toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ContentValidationException("Taille inconnue");
        }
    }

    static String parseTheme(String raw) {
        String t = raw == null || raw.isBlank() ? "melange" : raw.strip().toLowerCase(Locale.ROOT);
        if (!ArrowWords.THEMES.contains(t)) throw new ContentValidationException("Thème inconnu");
        return t;
    }

    static Level parseLevel(String raw) {
        try {
            return Level.valueOf((raw == null || raw.isBlank() ? "facile" : raw.strip()).toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ContentValidationException("Niveau inconnu");
        }
    }

    static int progress(CrosswordGame g) {
        String letters = g.getLetters();
        int cells = 0;
        int filled = 0;
        for (int i = 0; i < letters.length(); i++) {
            char c = letters.charAt(i);
            if (c == ArrowGrid.BLOCK) continue;
            cells++;
            if (c != '.') filled++;
        }
        return cells == 0 ? 0 : filled * 100 / cells;
    }

    private CrosswordGame visible(java.util.Optional<CrosswordGame> found, User me) {
        CrosswordGame game = found.orElseThrow(() -> new ResourceNotFoundException("Grille introuvable"));
        if (!game.isShared() && !game.getOwner().getId().equals(me.getId())) {
            throw new ResourceNotFoundException("Grille introuvable");
        }
        return game;
    }

    private GameDto toDto(CrosswordGame g) {
        return new GameDto(g.getId(), g.getSize(), g.getTheme(), g.getLevel(), g.isShared(), g.getOwner().getId(), g.getOwner().getDisplayName(),
                g.getWidth(), g.getHeight(), freshClues(g), g.getSolution(), g.getLetters(), g.getAuthors(),
                g.getCreatedAt(), g.getUpdatedAt(), g.getFinishedAt(), g.getDailyDate());
    }

    /**
     * The grid's clues, as the dictionary words them today: a clue corrected since the grid was made
     * shows corrected (the easy or the tricky one, as the grid's level goes), so no grid keeps an error.
     */
    List<ArrowGrid.Clue> freshClues(CrosswordGame g) {
        List<ArrowGrid.Clue> stored = fromJson(g.getClues());
        Set<String> texts = stored.stream().map(ArrowGrid.Clue::text).collect(Collectors.toCollection(HashSet::new));
        List<ArrowGrid.Clue> out = new ArrayList<>(stored.size());
        for (ArrowGrid.Clue c : stored) {
            ArrowWords.Word w = byWord.get(answer(g.getSolution(), g.getWidth(), c));
            if (w == null || c.text().equals(w.easy()) || c.text().equals(w.hard())) {
                out.add(c);
                continue;
            }
            boolean tricky = switch (g.getLevel()) {
                case "difficile" -> true;
                case "moyen" -> (c.cell() + c.start()) % 3 == 0;
                default -> false;
            };
            String text = tricky ? w.hard() : w.easy();
            if (texts.contains(text)) text = tricky ? w.easy() : w.hard(); // never two clues alike in a grid
            texts.add(text);
            out.add(new ArrowGrid.Clue(c.cell(), c.dir(), c.start(), c.length(), text));
        }
        return out;
    }

    private String toJson(List<ArrowGrid.Clue> clues) {
        try {
            return json.writeValueAsString(clues);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private List<ArrowGrid.Clue> fromJson(String clues) {
        try {
            return json.readValue(clues, new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private User requireUser(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
