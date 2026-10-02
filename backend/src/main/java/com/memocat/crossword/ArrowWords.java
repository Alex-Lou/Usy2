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
import java.util.List;
import java.util.Map;

/** The word list of the "mots fléchés" (resources/crossword/mots.txt: {@code MOT|définition}). */
@Component
public class ArrowWords {

    private final List<ArrowGenerator.Entry> entries;

    public ArrowWords() {
        this.entries = load("crossword/mots.txt");
    }

    public List<ArrowGenerator.Entry> entries() {
        return entries;
    }

    static List<ArrowGenerator.Entry> load(String path) {
        Map<String, ArrowGenerator.Entry> byWord = new LinkedHashMap<>();
        try (BufferedReader in = new BufferedReader(new InputStreamReader(
                new ClassPathResource(path).getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = in.readLine()) != null) {
                line = line.strip();
                if (line.isEmpty() || line.startsWith("#")) continue;
                int bar = line.indexOf('|');
                if (bar <= 0) continue;
                String word = line.substring(0, bar).strip();
                String clue = line.substring(bar + 1).strip();
                if (!word.matches("[A-Z]{2,12}") || clue.isEmpty()) continue;
                byWord.putIfAbsent(word, new ArrowGenerator.Entry(word, clue));
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return List.copyOf(new ArrayList<>(byWord.values()));
    }
}
