package com.memocat.crossword;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

/**
 * Builds a "mots fléchés" grid from a word list. Words are laid one at a time,
 * each crossing the ones already there, with the cell before each word kept for
 * its clue (so the first column and row hold clues, like in a magazine). Every
 * run of two letters or more in the grid is a word with its clue: a letter never
 * touches another one sideways unless both belong to a crossing word.
 * When nothing crosses any more, a word may also sit on its own in an empty
 * area. Several grids are tried; the fullest one wins.
 */
public final class ArrowGenerator {

    public record Entry(String word, String clue) {
    }

    private static final int RIGHT = 1;
    private static final int DOWN = 2;

    private final List<Entry> entries;

    public ArrowGenerator(List<Entry> entries) {
        this.entries = List.copyOf(entries);
    }

    public ArrowGrid generate(int width, int height, Random random, int attempts) {
        Attempt best = null;
        for (int a = 0; a < attempts; a++) {
            Attempt attempt = new Attempt(width, height, random);
            attempt.fill();
            if (best == null || attempt.letterCount() > best.letterCount()) best = attempt;
        }
        return best.toGrid();
    }

    private record Placed(Entry entry, boolean down, int row, int col) {
    }

    private final class Attempt {
        final int w;
        final int h;
        final Random rnd;
        final char[] letters; // 0: no letter
        final int[] clueBits; // RIGHT / DOWN: the cell holds that clue
        final List<Placed> placed = new ArrayList<>();
        final Set<String> used = new HashSet<>();

        Attempt(int w, int h, Random rnd) {
            this.w = w;
            this.h = h;
            this.rnd = rnd;
            this.letters = new char[w * h];
            this.clueBits = new int[w * h];
        }

        int letterCount() {
            int n = 0;
            for (char c : letters) if (c != 0) n++;
            return n;
        }

        void fill() {
            // A first word across, somewhere in the upper half, its clue in the first column.
            List<Entry> firsts = new ArrayList<>(entries.stream()
                    .filter(e -> e.word().length() >= Math.min(5, w - 1) && e.word().length() <= w - 1).toList());
            Collections.shuffle(firsts, rnd);
            int row = rnd.nextInt(Math.max(1, h / 2));
            for (Entry e : firsts) {
                if (fits(e.word(), false, row, 1) >= 0) {
                    place(e, false, row, 1);
                    break;
                }
            }
            if (placed.isEmpty()) return;

            for (int step = 0; step < w * h; step++) {
                Candidate best = bestCandidate();
                // Nothing crosses any more: a word on its own in an empty area (it has its clue,
                // so it is fair game), which then gives the next words something to cross.
                if (best == null) best = bestLoose();
                if (best == null) return;
                place(best.entry, best.down, best.row, best.col);
            }
        }

        /** The longest word that fits somewhere without crossing, sharing a clue cell when it can. */
        Candidate bestLoose() {
            List<Entry> pool = new ArrayList<>(entries);
            Collections.shuffle(pool, rnd);
            Candidate best = null;
            int tried = 0;
            for (Entry e : pool) {
                if (used.contains(e.word())) continue;
                if (++tried > 300) break;
                for (int cell = 0; cell < letters.length; cell++) {
                    int r = cell / w;
                    int c = cell % w;
                    for (boolean down : new boolean[] {false, true}) {
                        if (fits(e.word(), down, r, c) != 0) continue;
                        int clueCell = down ? cell - w : cell - 1;
                        double score = e.word().length() * 2 + (clueBits[clueCell] != 0 ? 3 : 0) + rnd.nextDouble() * 2;
                        if (best == null || score > best.score) best = new Candidate(e, down, r, c, score);
                    }
                }
            }
            return best;
        }

        private record Candidate(Entry entry, boolean down, int row, int col, double score) {
        }

        Candidate bestCandidate() {
            List<Entry> pool = new ArrayList<>(entries);
            Collections.shuffle(pool, rnd);
            Candidate best = null;
            int tried = 0;
            for (Entry e : pool) {
                if (used.contains(e.word())) continue;
                if (++tried > 600) break;
                String word = e.word();
                for (int i = 0; i < word.length(); i++) {
                    char ch = word.charAt(i);
                    for (int cell = 0; cell < letters.length; cell++) {
                        if (letters[cell] != ch) continue;
                        int r = cell / w;
                        int c = cell % w;
                        for (boolean down : new boolean[] {false, true}) {
                            int sr = down ? r - i : r;
                            int sc = down ? c : c - i;
                            int crossings = fits(word, down, sr, sc);
                            if (crossings <= 0) continue;
                            // Crossings make a dense grid; length fills it; a little chance varies it.
                            double score = crossings * 6 + word.length() + rnd.nextDouble() * 3;
                            if (best == null || score > best.score) best = new Candidate(e, down, sr, sc, score);
                        }
                    }
                }
            }
            return best;
        }

        boolean inside(int r, int c) {
            return r >= 0 && c >= 0 && r < h && c < w;
        }

        boolean letterAt(int r, int c) {
            return inside(r, c) && letters[r * w + c] != 0;
        }

        /** How many letters the word would share with the grid, or -1 if it cannot go there. */
        int fits(String word, boolean down, int r, int c) {
            int dr = down ? 1 : 0;
            int dc = down ? 0 : 1;
            int len = word.length();
            // The clue cell, just before the word.
            int cr = r - dr;
            int cc = c - dc;
            if (!inside(cr, cc) || letterAt(cr, cc)) return -1;
            if ((clueBits[cr * w + cc] & (down ? DOWN : RIGHT)) != 0) return -1;
            // Nothing right after the word (the grid's edge, a clue or an empty cell).
            if (letterAt(r + len * dr, c + len * dc)) return -1;
            int crossings = 0;
            for (int k = 0; k < len; k++) {
                int rr = r + k * dr;
                int cc2 = c + k * dc;
                if (!inside(rr, cc2)) return -1;
                int cell = rr * w + cc2;
                if (clueBits[cell] != 0) return -1;
                if (rr == cr && cc2 == cc) return -1;
                char existing = letters[cell];
                if (existing != 0) {
                    if (existing != word.charAt(k)) return -1;
                    crossings++;
                } else {
                    // A new letter must not touch another one sideways.
                    if (letterAt(rr + dc, cc2 + dr) || letterAt(rr - dc, cc2 - dr)) return -1;
                }
            }
            if (crossings == len) return -1; // already there entirely
            return crossings;
        }

        void place(Entry e, boolean down, int r, int c) {
            int dr = down ? 1 : 0;
            int dc = down ? 0 : 1;
            for (int k = 0; k < e.word().length(); k++) {
                letters[(r + k * dr) * w + (c + k * dc)] = e.word().charAt(k);
            }
            clueBits[(r - dr) * w + (c - dc)] |= down ? DOWN : RIGHT;
            placed.add(new Placed(e, down, r, c));
            used.add(e.word());
        }

        ArrowGrid toGrid() {
            StringBuilder solution = new StringBuilder(letters.length);
            for (char ch : letters) solution.append(ch == 0 ? ArrowGrid.BLOCK : ch);
            List<ArrowGrid.Clue> clues = new ArrayList<>();
            for (Placed p : placed) {
                int dr = p.down() ? 1 : 0;
                int dc = p.down() ? 0 : 1;
                int clueCell = (p.row() - dr) * w + (p.col() - dc);
                clues.add(new ArrowGrid.Clue(clueCell, p.down() ? "down" : "right", p.row() * w + p.col(),
                        p.entry().word().length(), p.entry().clue()));
            }
            clues.sort((a, b) -> a.cell() != b.cell() ? Integer.compare(a.cell(), b.cell()) : a.dir().compareTo(b.dir()));
            return new ArrowGrid(w, h, solution.toString(), List.copyOf(clues));
        }
    }
}
