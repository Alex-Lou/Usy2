package com.memocat.nous;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * 💞 Nous deux questions, read once from resources/nous (one file per theme),
 * each entry {@code [id, kind, question, options…]}. Kinds, all answered about
 * oneself then guessed by the other (but {@code p}):
 * <ul>
 * <li>{@code c} choices, several can be ticked (2 to 12 options);</li>
 * <li>{@code u} one choice only: this or that, yes or no (2 to 4 options);</li>
 * <li>{@code e} a scale from 0 to 10 (options: the words at both ends);</li>
 * <li>{@code o} a ranking, first to last (3 to 5 options);</li>
 * <li>{@code h} one word, that the other finds by playing hangman;</li>
 * <li>{@code m} a short answer, checked at once when it is the same word;</li>
 * <li>{@code f} a sentence to complete (its text holds "___");</li>
 * <li>{@code l} one's own words;</li>
 * <li>{@code p} a card just to talk about.</li>
 * </ul>
 * Entries that don't fit are skipped and logged; NousBankTest makes sure
 * there are none.
 */
@Component
public class NousBank {

    private static final Logger log = LoggerFactory.getLogger(NousBank.class);
    public static final String CHOICE = "c";
    public static final String ONE = "u";
    public static final String SCALE = "e";
    public static final String RANK = "o";
    public static final String HANGMAN = "h";
    public static final String SHORT = "m";
    public static final String FILL = "f";
    public static final String WORDS = "l";
    public static final String TALK = "p";
    public static final int MAX_OPTIONS = 12;
    /** A scale goes from 0 to this. */
    public static final int SCALE_MAX = 10;
    public static final String BLANK = "___";
    private static final Set<String> KINDS = Set.of(CHOICE, ONE, SCALE, RANK, HANGMAN, SHORT, FILL, WORDS, TALK);

    public record Theme(String id, String label, String emoji, String color) {
    }

    public record Question(String id, String theme, String kind, String text, List<String> options) {
        public boolean guessable() {
            return !TALK.equals(kind);
        }

        /** Answered in words (own words, a sentence to complete, a short answer or a hangman word). */
        public boolean inWords() {
            return Set.of(WORDS, FILL, SHORT, HANGMAN).contains(kind);
        }
    }

    public static final List<Theme> THEMES = List.of(
            new Theme("general", "Les basiques", "🧩", "#5b8def"),
            new Theme("tendre", "Tendres & souvenirs", "💗", "#ff6fa8"),
            new Theme("drole", "Drôles & absurdes", "🤪", "#f0a020"),
            new Theme("profond", "Profondes & futur", "🌌", "#7c6cf0"),
            new Theme("piment", "Pimentées soft", "🌶️", "#e2534f"),
            new Theme("gouts", "Goûts & food", "🍕", "#f07c32"),
            new Theme("culture", "Culture & loisirs", "🎬", "#2fb3c4"),
            new Theme("enfance", "Enfance & famille", "🧸", "#c48a4a"),
            new Theme("voyages", "Voyages & rêves", "✈️", "#3a9be8"),
            new Theme("manies", "Manies & habitudes", "🙃", "#9b6ef0"),
            new Theme("travail", "Travail & ambitions", "💼", "#4f7fb5"),
            new Theme("etsi", "Et si…", "🤔", "#1fae86"),
            new Theme("histoire", "Notre histoire", "💑", "#e0567a"));

    private final Map<String, Question> byId = new LinkedHashMap<>();

    public NousBank() {
        ObjectMapper json = new ObjectMapper();
        for (Theme t : THEMES) {
            for (JsonNode e : read(json, "nous/" + t.id() + ".json")) {
                String id = e.path(0).asText("");
                String kind = e.path(1).asText("");
                String text = e.path(2).asText("").strip();
                List<String> options = e.size() > 3 ? options(e) : List.of();
                boolean ok = id.matches("[a-z0-9]{2,20}") && !byId.containsKey(id) && KINDS.contains(kind)
                        && !text.isEmpty() && text.length() <= 140 && options != null && fits(kind, text, options.size());
                if (!ok) {
                    log.warn("Nous deux: skipped a question of {} ({})", t.id(), id);
                    continue;
                }
                byId.put(id, new Question(id, t.id(), kind, text, options));
            }
        }
    }

    public List<Question> all() {
        return List.copyOf(byId.values());
    }

    public Optional<Question> question(String id) {
        return Optional.ofNullable(id == null ? null : byId.get(id));
    }

    public static Optional<Theme> theme(String id) {
        return THEMES.stream().filter(t -> t.id().equals(id)).findFirst();
    }

    /** How many options each kind takes (and a sentence to complete has its blank). */
    private static boolean fits(String kind, String text, int options) {
        return switch (kind) {
            case CHOICE -> options >= 2 && options <= MAX_OPTIONS;
            case ONE -> options >= 2 && options <= 4;
            case SCALE -> options == 2;
            case RANK -> options >= 3 && options <= 5;
            case FILL -> options == 0 && text.contains(BLANK);
            default -> options == 0;
        };
    }

    private static List<String> options(JsonNode e) {
        List<String> out = new ArrayList<>();
        for (int i = 3; i < e.size(); i++) {
            String s = e.path(i).asText("").strip();
            if (s.isEmpty() || s.length() > 60) {
                return null;
            }
            out.add(s);
        }
        return new HashSet<>(out.stream().map(String::toLowerCase).toList()).size() == out.size() ? List.copyOf(out) : null;
    }

    private static JsonNode read(ObjectMapper json, String path) {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return json.readTree(in);
        } catch (IOException e) {
            log.warn("Nous deux: {} unreadable ({})", path, e.getClass().getSimpleName());
            return json.createArrayNode();
        }
    }
}
