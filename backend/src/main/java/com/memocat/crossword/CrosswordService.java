package com.memocat.crossword;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.couple.CoupleActivity;
import com.memocat.crossword.CrosswordDtos.CellDto;
import com.memocat.crossword.CrosswordDtos.Change;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/** ✏️ Mots fléchés: a new grid from the word list, played alone or together, saved as you type. */
@Service
public class CrosswordService {

    /** The three sizes: columns × rows, and how many grids are tried (the fullest wins; big ones cost more). */
    enum Size {
        PETITE(7, 8, 8), MOYENNE(9, 11, 6), GRANDE(11, 13, 5);

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

    static final int MAX_CHANGES = 60;
    static final int LIST_SIZE = 30;

    private final CrosswordGameRepository games;
    private final UserRepository users;
    private final ArrowWords words;
    private final ObjectMapper json;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final Random random;

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
    }

    @Transactional
    public GameDto create(String username, String size, boolean shared, String theme, String level) {
        User me = requireUser(username);
        Size s = parseSize(size);
        String t = parseTheme(theme);
        Level l = parseLevel(level);
        ArrowGrid grid = new ArrowGenerator(entries(t, l)).generate(s.width, s.height, random, s.attempts);
        CrosswordGame game = games.save(new CrosswordGame(me, s.name().toLowerCase(Locale.ROOT), t,
                l.name().toLowerCase(Locale.ROOT), shared, grid.width(), grid.height(), toJson(grid.clues()),
                grid.solution(), clock.instant()));
        if (shared) {
            events.publishEvent(CoupleActivity.of(CoupleActivity.CROSSWORD, me, game.getSize(), game.getId()));
        }
        return toDto(game);
    }

    /** The words a grid may use, with the clue it shows; the theme's words come first. */
    List<ArrowGenerator.Entry> entries(String theme, Level level) {
        boolean anyTheme = theme.equals("melange");
        return words.words().stream()
                .filter(w -> w.level() <= level.maxWordLevel)
                .map(w -> new ArrowGenerator.Entry(w.word(),
                        random.nextDouble() < level.hardClues ? w.hard() : w.easy(),
                        !anyTheme && w.themes().contains(theme)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SummaryDto> list(String username) {
        User me = requireUser(username);
        return games.findVisibleTo(me.getId(), PageRequest.of(0, LIST_SIZE)).stream()
                .map(g -> new SummaryDto(g.getId(), g.getSize(), g.getTheme(), g.getLevel(), g.isShared(), g.getOwner().getDisplayName(),
                        g.getOwner().getId().equals(me.getId()), progress(g), g.getCreatedAt(), g.getUpdatedAt(),
                        g.getFinishedAt()))
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
                g.getWidth(), g.getHeight(), fromJson(g.getClues()), g.getSolution(), g.getLetters(), g.getAuthors(),
                g.getCreatedAt(), g.getUpdatedAt(), g.getFinishedAt());
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
