package com.memocat.crossword;

import org.junit.jupiter.api.Test;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class ArrowGeneratorTest {

    private static final List<ArrowWords.Word> DICTIONARY = ArrowWords.loadAll();
    private static final List<ArrowGenerator.Entry> EASY = DICTIONARY.stream()
            .filter(w -> w.level() == 1).map(w -> new ArrowGenerator.Entry(w.word(), w.easy())).toList();
    private static final List<ArrowGenerator.Entry> ALL = DICTIONARY.stream()
            .map(w -> new ArrowGenerator.Entry(w.word(), w.hard())).toList();
    private static final int[][] SIZES = {{7, 8}, {9, 11}, {9, 13}};

    @Test
    void theDictionaryLoadsWithItsThemes() {
        assertThat(DICTIONARY).hasSizeGreaterThan(2800);
        assertThat(DICTIONARY).allMatch(w -> w.word().matches("[A-Z]{2,12}") && !w.easy().isBlank() && !w.hard().isBlank());
        for (String theme : ArrowWords.THEMES) {
            if (theme.equals("melange")) continue;
            assertThat(DICTIONARY.stream().filter(w -> w.themes().contains(theme)).count())
                    .as(theme).isGreaterThan(100);
        }
    }

    /** A word alone on its line, in a theme file, gives that theme to a word of another file. */
    @Test
    void aThemeCanClaimACommonWord() {
        ArrowWords.Word sel = DICTIONARY.stream().filter(w -> w.word().equals("SEL")).findFirst().orElseThrow();
        assertThat(sel.themes()).contains("cuisine");
        assertThat(sel.easy()).isEqualTo("Cristaux de la mer");
    }

    /** A clue never gives its answer away, not even as the start of a longer word (3 letters or more). */
    @Test
    void noClueContainsItsAnswer() {
        for (ArrowWords.Word w : DICTIONARY) {
            if (w.word().length() < 3) continue;
            for (String clue : List.of(w.easy(), w.hard())) {
                for (String token : plain(clue).split("[^A-Z]+")) {
                    assertThat(token.startsWith(w.word())).as("%s : %s", w.word(), clue).isFalse();
                }
            }
        }
    }

    /** « Les ___ », « des ___ »… : a plural blank takes a plural answer. */
    @Test
    void aPluralBlankHasAPluralAnswer() {
        Pattern plural = Pattern.compile("\\b(les|des|ses|mes|tes|nos|vos|leurs|aux)\\s+___", Pattern.CASE_INSENSITIVE);
        for (ArrowWords.Word w : DICTIONARY) {
            for (String clue : List.of(w.easy(), w.hard())) {
                if (plural.matcher(clue).find()) {
                    assertThat(w.word()).as("%s : %s", w.word(), clue).matches(".*[SX]");
                }
            }
        }
    }

    /** What the players complained about: no cell is left without a letter or a clue. */
    @Test
    void everyCellHoldsALetterOrAClue() {
        for (int seed = 0; seed < 10; seed++) {
            for (int[] size : SIZES) {
                ArrowGrid g = new ArrowGenerator(EASY).generate(size[0], size[1], new Random(seed), 1);
                Set<Integer> clueCells = new HashSet<>();
                g.clues().forEach(c -> clueCells.add(c.cell()));
                for (int cell = 0; cell < g.solution().length(); cell++) {
                    if (g.solution().charAt(cell) == ArrowGrid.BLOCK) {
                        assertThat(clueCells).as("cell %d of %s", cell, g.solution()).contains(cell);
                    }
                }
            }
        }
    }

    @Test
    void everyRunOfLettersIsAWordWithItsClue() {
        Map<String, String> clueOf = new HashMap<>();
        ALL.forEach(e -> clueOf.put(e.word(), e.clue()));
        for (int seed = 0; seed < 10; seed++) {
            for (int[] size : SIZES) {
                check(new ArrowGenerator(ALL).generate(size[0], size[1], new Random(seed), 1), clueOf);
            }
        }
    }

    @Test
    void sameSeedSameGrid() {
        ArrowGrid a = new ArrowGenerator(EASY).generate(9, 11, new Random(42), 2);
        ArrowGrid b = new ArrowGenerator(EASY).generate(9, 11, new Random(42), 2);
        assertThat(a).isEqualTo(b);
    }

    static String answer(ArrowGrid g, ArrowGrid.Clue c) {
        int step = c.dir().equals("down") ? g.width() : 1;
        StringBuilder sb = new StringBuilder();
        for (int k = 0; k < c.length(); k++) sb.append(g.solution().charAt(c.start() + k * step));
        return sb.toString();
    }

    private static String plain(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toUpperCase().replace("Œ", "OE");
    }

    /**
     * The rules of a printed grid: each clue sits in a clue cell next to its word's first letter
     * (straight, or bent on the first row and column), holds its word's clue, and every cell holds
     * one or two clues; every run of two letters or more is one of the words; every letter is
     * crossed (the first row's and column's letters belong to one word, never touching); no word twice.
     */
    static void check(ArrowGrid g, Map<String, String> clueOf) {
        int w = g.width();
        int h = g.height();
        String sol = g.solution();
        Map<String, String> wordAt = new HashMap<>(); // "dir:start" -> answer
        Map<Integer, Integer> cluesPerCell = new HashMap<>();
        Set<String> answers = new HashSet<>();
        for (ArrowGrid.Clue c : g.clues()) {
            boolean down = c.dir().equals("down");
            int r = c.cell() / w;
            int col = c.cell() % w;
            assertThat(sol.charAt(c.cell())).isEqualTo(ArrowGrid.BLOCK);
            boolean straight = c.start() == c.cell() + (down ? w : 1);
            boolean bent = down ? r == 0 && c.start() == c.cell() + 1 : col == 0 && c.start() == c.cell() + w;
            assertThat(straight || bent).as("clue %s", c).isTrue();
            String answer = answer(g, c);
            assertThat(answer).doesNotContain("#");
            assertThat(c.text()).isEqualTo(clueOf.get(answer));
            assertThat(answers.add(answer)).as("%s twice", answer).isTrue();
            wordAt.put(c.dir() + ":" + c.start(), answer);
            assertThat(cluesPerCell.merge(c.cell(), 1, Integer::sum)).isLessThanOrEqualTo(2);
        }
        for (boolean down : new boolean[] {false, true}) {
            int outer = down ? w : h;
            int inner = down ? h : w;
            for (int o = 0; o < outer; o++) {
                int i = 0;
                while (i < inner) {
                    int cell = down ? i * w + o : o * w + i;
                    if (sol.charAt(cell) == ArrowGrid.BLOCK) {
                        i++;
                        continue;
                    }
                    int start = cell;
                    StringBuilder run = new StringBuilder();
                    while (i < inner && sol.charAt(down ? i * w + o : o * w + i) != ArrowGrid.BLOCK) {
                        run.append(sol.charAt(down ? i * w + o : o * w + i));
                        i++;
                    }
                    boolean edge = o == 0; // a run down the first column, or across the first row
                    if (run.length() >= 2) {
                        assertThat(edge).as("letters touching on the edge at %d", start).isFalse();
                        assertThat(wordAt.get((down ? "down" : "right") + ":" + start))
                                .as("run %s at %d", run, start).isEqualTo(run.toString());
                    } else {
                        // A lone letter this way: only on the edge, where the letter's word goes the other way.
                        assertThat(edge).as("unchecked letter at %d in %s", start, sol).isTrue();
                    }
                }
            }
        }
    }
}
