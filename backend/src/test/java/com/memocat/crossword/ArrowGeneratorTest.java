package com.memocat.crossword;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;

class ArrowGeneratorTest {

    private static final List<ArrowWords.Word> DICTIONARY = ArrowWords.loadAll();
    private static final List<ArrowGenerator.Entry> WORDS = DICTIONARY.stream()
            .map(w -> new ArrowGenerator.Entry(w.word(), w.easy())).toList();

    @Test
    void theDictionaryLoadsWithItsThemes() {
        assertThat(DICTIONARY).hasSizeGreaterThan(2000);
        assertThat(DICTIONARY).allMatch(w -> w.word().matches("[A-Z]{2,12}") && !w.easy().isBlank() && !w.hard().isBlank());
        for (String theme : ArrowWords.THEMES) {
            if (theme.equals("melange")) continue;
            assertThat(DICTIONARY.stream().filter(w -> w.themes().contains(theme)).count())
                    .as(theme).isGreaterThan(100);
        }
    }

    /** A clue never gives its own answer away (words of 3 letters or more). */
    @Test
    void noClueContainsItsAnswer() {
        for (ArrowWords.Word w : DICTIONARY) {
            if (w.word().length() < 3) continue;
            for (String clue : List.of(w.easy(), w.hard())) {
                String plain = java.text.Normalizer.normalize(clue, java.text.Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "").toUpperCase().replace("Œ", "OE");
                assertThat(plain.split("[^A-Z]+")).as("%s : %s", w.word(), clue).doesNotContain(w.word());
            }
        }
    }

    @Test
    void aThemeFillsItsGrid() {
        double total = 0;
        for (int seed = 0; seed < 10; seed++) {
            List<ArrowGenerator.Entry> entries = DICTIONARY.stream()
                    .map(w -> new ArrowGenerator.Entry(w.word(), w.easy(), w.themes().contains("cuisine"))).toList();
            ArrowGrid g = new ArrowGenerator(entries).generate(9, 11, new Random(seed), 8);
            java.util.Set<String> cuisine = new java.util.HashSet<>(DICTIONARY.stream()
                    .filter(w -> w.themes().contains("cuisine")).map(ArrowWords.Word::word).toList());
            long themed = g.clues().stream().filter(c -> cuisine.contains(answer(g, c))).count();
            total += (double) themed / g.clues().size();
        }
        assertThat(total / 10).isGreaterThan(0.4);
    }

    static String answer(ArrowGrid g, ArrowGrid.Clue c) {
        int step = c.dir().equals("down") ? g.width() : 1;
        StringBuilder sb = new StringBuilder();
        for (int k = 0; k < c.length(); k++) sb.append(g.solution().charAt(c.start() + k * step));
        return sb.toString();
    }

    @Test
    void everyRunOfLettersIsAWordWithItsClue() {
        for (int seed = 0; seed < 30; seed++) {
            for (int[] size : new int[][] {{7, 8}, {9, 11}, {11, 13}}) {
                ArrowGrid g = new ArrowGenerator(WORDS).generate(size[0], size[1], new Random(seed), 6);
                check(g);
            }
        }
    }

    @Test
    void theGridIsWellFilled() {
        double total = 0;
        int n = 0;
        for (int seed = 0; seed < 20; seed++) {
            ArrowGrid g = new ArrowGenerator(WORDS).generate(9, 11, new Random(seed), 8);
            long letters = g.solution().chars().filter(c -> c != ArrowGrid.BLOCK).count();
            total += (double) letters / g.solution().length();
            n++;
        }
        assertThat(total / n).isGreaterThan(0.45);
    }

    @Test
    void sameSeedSameGrid() {
        ArrowGrid a = new ArrowGenerator(WORDS).generate(9, 11, new Random(42), 4);
        ArrowGrid b = new ArrowGenerator(WORDS).generate(9, 11, new Random(42), 4);
        assertThat(a).isEqualTo(b);
    }

    static void check(ArrowGrid g) {
        int w = g.width();
        String sol = g.solution();
        Map<String, String> wordAt = new HashMap<>(); // "dir:start" -> answer
        Map<String, Integer> cluesPerCellDir = new HashMap<>();
        for (ArrowGrid.Clue c : g.clues()) {
            boolean down = c.dir().equals("down");
            int step = down ? w : 1;
            assertThat(c.start()).isEqualTo(c.cell() + step);
            assertThat(sol.charAt(c.cell())).isEqualTo(ArrowGrid.BLOCK);
            StringBuilder answer = new StringBuilder();
            for (int k = 0; k < c.length(); k++) answer.append(sol.charAt(c.start() + k * step));
            assertThat(answer.toString()).doesNotContain("#");
            wordAt.put(c.dir() + ":" + c.start(), answer.toString());
            assertThat(cluesPerCellDir.merge(c.cell() + c.dir(), 1, Integer::sum)).isEqualTo(1);
        }
        // Every horizontal and vertical run of 2+ letters is exactly one clued word.
        int h = g.height();
        for (boolean down : new boolean[] {false, true}) {
            int outer = down ? w : h;
            int inner = down ? h : w;
            for (int o = 0; o < outer; o++) {
                int i = 0;
                while (i < inner) {
                    int cell = down ? i * w + o : o * w + i;
                    if (sol.charAt(cell) == ArrowGrid.BLOCK) { i++; continue; }
                    int start = cell;
                    int len = 0;
                    StringBuilder run = new StringBuilder();
                    while (i < inner && sol.charAt(down ? i * w + o : o * w + i) != ArrowGrid.BLOCK) {
                        run.append(sol.charAt(down ? i * w + o : o * w + i));
                        len++;
                        i++;
                    }
                    if (len >= 2) {
                        assertThat(wordAt.get((down ? "down" : "right") + ":" + start))
                                .as("run %s at %d", run, start).isEqualTo(run.toString());
                    }
                }
            }
        }
        // Every letter belongs to a word.
        for (int cell = 0; cell < sol.length(); cell++) {
            if (sol.charAt(cell) == ArrowGrid.BLOCK) continue;
            final int c0 = cell;
            boolean covered = g.clues().stream().anyMatch(c -> {
                int step = c.dir().equals("down") ? w : 1;
                for (int k = 0; k < c.length(); k++) if (c.start() + k * step == c0) return true;
                return false;
            });
            assertThat(covered).isTrue();
        }
    }
}
