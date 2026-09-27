package com.memocat.quiz;

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

/**
 * The quiz questions, read once from resources/quiz: one file per theme, each
 * entry {@code [level, question, right answer, wrong, wrong, wrong]}. Entries that
 * don't fit (bad level, repeated or empty options) are skipped and logged;
 * QuizBankTest makes sure there are none.
 */
@Component
public class QuizBank {

    private static final Logger log = LoggerFactory.getLogger(QuizBank.class);
    public static final int LEVELS = 5;

    public record Theme(String id, String label, String emoji, String color) {
    }

    /** A trivia question: {@code options[0]} is the right one (shuffled when served). */
    public record Question(String theme, int level, String text, List<String> options) {
    }

    public static final List<Theme> THEMES = List.of(
            new Theme("histoire", "Histoire", "🏛️", "#e0a44a"),
            new Theme("geo", "Géographie", "🌍", "#3fa7d6"),
            new Theme("sciences", "Sciences & nature", "🔬", "#59c28a"),
            new Theme("cinema", "Cinéma & séries", "🎬", "#e2534f"),
            new Theme("musique", "Musique", "🎵", "#b36ae2"),
            new Theme("sport", "Sport", "⚽", "#f08a24"),
            new Theme("geek", "Jeux vidéo & geek", "🎮", "#5b6cf0"),
            new Theme("animaux", "Animaux", "🐾", "#8a6a4a"),
            new Theme("cuisine", "Cuisine & gastronomie", "🍳", "#d9567c"));

    private final Map<String, List<Question>> byLevel = new LinkedHashMap<>();

    public QuizBank() {
        ObjectMapper json = new ObjectMapper();
        for (Theme t : THEMES) {
            for (JsonNode e : read(json, "quiz/" + t.id() + ".json")) {
                List<String> options = texts(e, 2, 6);
                int level = e.path(0).asInt(0);
                if (level < 1 || level > LEVELS || options == null || e.path(1).asText("").isBlank()) {
                    log.warn("Quiz: skipped a question of {} ({})", t.id(), e.path(1).asText(""));
                    continue;
                }
                byLevel.computeIfAbsent(key(t.id(), level), k -> new ArrayList<>())
                        .add(new Question(t.id(), level, e.path(1).asText().strip(), options));
            }
        }
    }

    public static String key(String theme, int level) {
        return theme + ":" + level;
    }

    public List<Question> level(String theme, int level) {
        return byLevel.getOrDefault(key(theme, level), List.of());
    }

    public static Optional<Theme> theme(String id) {
        return THEMES.stream().filter(t -> t.id().equals(id)).findFirst();
    }

    private static List<String> texts(JsonNode e, int from, int to) {
        List<String> out = new ArrayList<>();
        for (int i = from; i < to; i++) {
            String s = e.path(i).asText("").strip();
            if (s.isEmpty() || s.length() > 120) {
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
            log.warn("Quiz: {} unreadable ({})", path, e.getClass().getSimpleName());
            return json.createArrayNode();
        }
    }
}
