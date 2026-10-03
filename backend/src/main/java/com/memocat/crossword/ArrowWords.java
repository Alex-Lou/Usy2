package com.memocat.crossword;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The "mots fléchés" dictionary: resources/crossword/themes/*.txt, one word per
 * line as {@code MOT|niveau|définition facile|définition difficile} (niveau: 1 common,
 * 2 less common, 3 rare). general, courants, courts (short words) and formes (plurals,
 * verb forms) are the common words every grid uses; the other files are themes. A word
 * listed in several files belongs to all of them (its first clues are kept); a theme file
 * may also give a word alone on its line, a word of another file that belongs to the theme.
 */
@Component
public class ArrowWords {

    /** The themes, as offered in the app (mélange: no theme). */
    public static final List<String> THEMES = List.of("melange", "cuisine", "nature", "voyage", "maison", "culture",
            "sport", "corps", "amour");

    /** The longest word the list may hold. */
    static final int MAX_LENGTH = 12;

    private static final List<String> COMMON_FILES = List.of("general", "courants", "courts", "formes");

    public record Word(String word, int level, String easy, String hard, Set<String> themes) {
    }

    private final List<Word> words;

    public ArrowWords() {
        this.words = loadAll();
    }

    public List<Word> words() {
        return words;
    }

    static List<Word> loadAll() {
        Map<String, Word> byWord = new LinkedHashMap<>();
        List<String> files = new ArrayList<>(COMMON_FILES);
        THEMES.stream().filter(t -> !t.equals("melange")).forEach(files::add);
        Map<String, List<String>> tags = new LinkedHashMap<>(); // word alone on its line -> its themes
        for (String file : files) {
            String theme = COMMON_FILES.contains(file) ? null : file;
            for (String[] row : read("crossword/themes/" + file + ".txt")) {
                String w = row[0];
                if (row.length == 1) {
                    if (theme != null) tags.computeIfAbsent(w, k -> new ArrayList<>()).add(theme);
                    continue;
                }
                Word existing = byWord.get(w);
                Set<String> themes = new LinkedHashSet<>(existing == null ? Set.of() : existing.themes());
                if (theme != null) themes.add(theme);
                if (existing == null) {
                    byWord.put(w, new Word(w, Integer.parseInt(row[1]), row[2], row[3], Set.copyOf(themes)));
                } else {
                    byWord.put(w, new Word(w, existing.level(), existing.easy(), existing.hard(), Set.copyOf(themes)));
                }
            }
        }
        tags.forEach((w, themes) -> {
            Word existing = byWord.get(w);
            if (existing == null) return;
            Set<String> all = new LinkedHashSet<>(existing.themes());
            all.addAll(themes);
            byWord.put(w, new Word(w, existing.level(), existing.easy(), existing.hard(), Set.copyOf(all)));
        });
        return List.copyOf(byWord.values());
    }

    private static List<String[]> read(String path) {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader in = new BufferedReader(new InputStreamReader(
                new ClassPathResource(path).getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = in.readLine()) != null) {
                line = line.strip();
                if (line.isEmpty() || line.startsWith("#")) continue;
                if (line.matches("[A-Z]{2," + MAX_LENGTH + "}")) { // a word of another file, for this theme
                    rows.add(new String[] {line});
                    continue;
                }
                String[] parts = line.split("\\|", -1);
                if (parts.length != 4) continue;
                for (int i = 0; i < 4; i++) parts[i] = parts[i].strip();
                if (!parts[0].matches("[A-Z]{2," + MAX_LENGTH + "}") || !parts[1].matches("[123]")
                        || parts[2].isEmpty() || parts[3].isEmpty()) continue;
                rows.add(parts);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return rows;
    }
}
