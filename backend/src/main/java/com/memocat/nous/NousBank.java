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
 * each entry {@code [id, kind, question, options (2 to 12) for a choice]}. Kinds:
 * {@code c} choices (several can be ticked) and {@code l} one's own words (both answered about
 * oneself, then guessed by the other), {@code p} a card just to talk about.
 * Entries that don't fit are skipped and logged; NousBankTest makes sure
 * there are none.
 */
@Component
public class NousBank {

    private static final Logger log = LoggerFactory.getLogger(NousBank.class);
    public static final String CHOICE = "c";
    public static final String WORDS = "l";
    public static final String TALK = "p";
    public static final int MAX_OPTIONS = 12;

    public record Theme(String id, String label, String emoji, String color) {
    }

    public record Question(String id, String theme, String kind, String text, List<String> options) {
        public boolean guessable() {
            return !TALK.equals(kind);
        }
    }

    public static final List<Theme> THEMES = List.of(
            new Theme("general", "Les basiques", "🧩", "#5b8def"),
            new Theme("tendre", "Tendres & souvenirs", "💗", "#ff6fa8"),
            new Theme("drole", "Drôles & absurdes", "🤪", "#f0a020"),
            new Theme("profond", "Profondes & futur", "🌌", "#7c6cf0"),
            new Theme("piment", "Pimentées soft", "🌶️", "#e2534f"));

    private final Map<String, Question> byId = new LinkedHashMap<>();

    public NousBank() {
        ObjectMapper json = new ObjectMapper();
        for (Theme t : THEMES) {
            for (JsonNode e : read(json, "nous/" + t.id() + ".json")) {
                String id = e.path(0).asText("");
                String kind = e.path(1).asText("");
                String text = e.path(2).asText("").strip();
                List<String> options = CHOICE.equals(kind) ? options(e) : List.of();
                boolean ok = id.matches("[a-z0-9]{2,20}") && !byId.containsKey(id) && Set.of(CHOICE, WORDS, TALK).contains(kind)
                        && !text.isEmpty() && text.length() <= 140 && options != null
                        && (CHOICE.equals(kind) ? options.size() >= 2 && options.size() <= MAX_OPTIONS : e.size() == 3);
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
