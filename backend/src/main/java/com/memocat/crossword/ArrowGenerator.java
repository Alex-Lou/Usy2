package com.memocat.crossword;

import java.util.ArrayList;
import java.util.BitSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;

/**
 * Builds a full "mots fléchés" grid, as printed in magazines: every cell holds
 * either a letter or a clue, never nothing. On the first row and the first
 * column two letters never touch: each one starts a word (down from the first
 * row, across from the first column) whose clue is in the cell before it on that
 * edge, with a bent arrow. Inside, the grid is filled letter by letter (row by
 * row), each letter keeping its row and its column on the way to a word of the
 * list; a clue cell goes in where a word ends. Every letter belongs to a word
 * across and a word down (the edge ones to one word only), every clue cell holds
 * one or two clues, and no word (nor clue) appears twice. Several grids are
 * made; the one with the fewest clue cells (then the most theme words) wins.
 */
public final class ArrowGenerator {

    /** {@code favored}: a word of the chosen theme, preferred whenever it fits. */
    public record Entry(String word, String clue, boolean favored) {

        public Entry(String word, String clue) {
            this(word, clue, false);
        }
    }

    /** How much a theme word outweighs another one when choosing the next letter. */
    static final double THEME_BONUS = 7;

    /** Search steps for one grid before starting over. */
    private static final int BUDGET = 20_000;
    /** Restarts allowed for each grid asked (a grid always comes out in the end). */
    private static final int RESTARTS = 2_000;

    private static final char CLUE = '#';
    private static final int CLUE_OPTION = 26;
    /** How often a clue cell is tried before the letters (when it may go there). */
    private static final double CLUE_FIRST = 0.4;
    /** A dead end of this cell's own, set by its row and column so far: try its next option. */
    private static final BitSet SKIP = new BitSet();
    /** The same, set by the clue cells around it. */
    private static final BitSet SKIP_NEAR_CLUES = new BitSet();

    private final List<Entry> entries;
    private final Node root = new Node();
    /** Per entry, its clue's number: two words with the same clue never share a grid (nor a word itself twice). */
    private final int[] clueKey;
    private final int clueCount;

    public ArrowGenerator(List<Entry> entries) {
        this.entries = List.copyOf(entries);
        this.clueKey = new int[this.entries.size()];
        Map<String, Integer> keys = new HashMap<>();
        for (int i = 0; i < this.entries.size(); i++) {
            add(i);
            clueKey[i] = keys.computeIfAbsent(this.entries.get(i).clue().toLowerCase(Locale.ROOT), k -> keys.size());
        }
        this.clueCount = keys.size();
    }

    /**
     * A letter tree of the words: {@code lengths} has bit n set when a word of n letters goes through,
     * {@code byLength[n]} counts them.
     */
    private static final class Node {
        final Node[] next = new Node[26];
        int entry = -1;
        int lengths;
        final int[] byLength = new int[ArrowWords.MAX_LENGTH + 1];
        int favored;
    }

    private void add(int index) {
        Entry e = entries.get(index);
        String w = e.word();
        Node n = root;
        for (int k = 0; ; k++) {
            n.lengths |= 1 << w.length();
            n.byLength[w.length()]++;
            if (e.favored()) n.favored++;
            if (k == w.length()) break;
            int i = w.charAt(k) - 'A';
            if (n.next[i] == null) n.next[i] = new Node();
            n = n.next[i];
        }
        if (n.entry < 0) n.entry = index;
    }

    public ArrowGrid generate(int width, int height, Random random, int attempts) {
        Fill best = null;
        int found = 0;
        for (int tries = 0; found < attempts && tries < attempts * RESTARTS; tries++) {
            Fill fill = new Fill(width, height, random);
            if (!fill.run()) continue;
            found++;
            if (best == null || fill.score() > best.score()) best = fill;
        }
        if (best == null) throw new IllegalStateException("No grid found for " + width + "x" + height);
        return best.toGrid();
    }

    private final class Fill {
        final int w;
        final int h;
        final Random rnd;
        final char[] g;
        final Node[] colNode; // the column's word so far (null: no word open)
        final int[] colLen;
        final boolean[] used = new boolean[clueCount]; // by clue: see clueKey
        final int[][] options; // per cell, the letters (and the clue cell) to try, in order
        final double[] keys = new double[26];
        int budget = BUDGET;
        boolean aborted;

        Fill(int w, int h, Random rnd) {
            this.w = w;
            this.h = h;
            this.rnd = rnd;
            this.g = new char[w * h];
            this.colNode = new Node[w];
            this.colLen = new int[w];
            this.options = new int[w * h][27];
        }

        boolean run() {
            return solve(0, null, 0) == null && !aborted;
        }

        /**
         * A clue cell is required here: the top left corner, and on the first row or column
         * after a letter (two letters never touch there, each one starting its own word).
         */
        boolean edgeClue(int r, int c) {
            if (r == 0 && c == 0) return true;
            if (r == 0) return g[c - 1] != CLUE;
            return c == 0 && g[(r - 1) * w] != CLUE;
        }

        /**
         * Fills {@code cell} and the ones after it ({@code rowNode}/{@code rowLen}: the row's word so far).
         * Returns null when the grid is full; otherwise the earlier cells to blame for the dead end, so
         * the search goes straight back to the last of them (conflict-directed backjumping) instead of
         * trying every letter in between.
         */
        BitSet solve(int cell, Node rowNode, int rowLen) {
            if (cell == g.length) return null;
            if (--budget < 0) aborted = true;
            if (aborted) return new BitSet();
            int r = cell / w;
            int c = cell % w;
            int[] order = options[cell];
            int count;
            if (edgeClue(r, c)) {
                order[0] = CLUE_OPTION;
                count = 1;
            } else {
                count = letterOrder(order, rowLen == 0 ? root : rowNode, rowLen + 1, w - (c - rowLen),
                        colLen[c] == 0 ? root : colNode[c], colLen[c] + 1, h - (r - colLen[c]));
                // A clue cell may end the words here; now and then it is tried first,
                // which keeps words short enough to cross well.
                if (rnd.nextDouble() < CLUE_FIRST) {
                    System.arraycopy(order, 0, order, 1, count);
                    order[0] = CLUE_OPTION;
                } else {
                    order[count] = CLUE_OPTION;
                }
                count++;
            }
            BitSet blame = null;
            boolean nearClues = false;
            for (int k = 0; k < count; k++) {
                int option = order[k];
                BitSet res = option == CLUE_OPTION ? putClue(cell, rowNode, rowLen) : putLetter(cell, option, rowNode, rowLen);
                if (res == SKIP) continue;
                if (res == SKIP_NEAR_CLUES) {
                    nearClues = true;
                    continue;
                }
                if (res == null || aborted) return res;
                if (!res.get(cell)) return res; // this cell is not to blame: jump further back
                res.clear(cell);
                if (blame == null) blame = res;
                else blame.or(res);
            }
            // Every option failed: blame what decided them (the row and column so far, the clue cells
            // around) and what failed further on.
            if (blame == null) blame = new BitSet();
            blame.or(runs(r, c));
            if (nearClues) blame.or(around(cell));
            return blame;
        }

        BitSet putLetter(int cell, int i, Node rowNode, int rowLen) {
            int r = cell / w;
            int c = cell % w;
            Node colPrev = colNode[c];
            int colPrevLen = colLen[c];
            Node rn = rowLen == 0 ? root.next[i] : rowNode.next[i];
            Node cn = colPrevLen == 0 ? root.next[i] : colPrev.next[i];
            // The first row's letters are words down only, the first column's words across only.
            boolean rowOk = r == 0 || possible(rn, rowLen + 1, w - (c - rowLen));
            boolean colOk = c == 0 || possible(cn, colPrevLen + 1, h - (r - colPrevLen));
            if (!rowOk || !colOk) return SKIP;
            g[cell] = (char) ('A' + i);
            colNode[c] = c == 0 ? null : cn;
            colLen[c] = c == 0 ? 0 : colPrevLen + 1;
            BitSet res = next(cell, r == 0 ? null : rn, r == 0 ? 0 : rowLen + 1);
            if (res == null) return null; // solved: the grid keeps it
            g[cell] = 0;
            colNode[c] = colPrev;
            colLen[c] = colPrevLen;
            return res;
        }

        /** A clue cell here, closing the words that end before it. */
        BitSet putClue(int cell, Node rowNode, int rowLen) {
            int r = cell / w;
            int c = cell % w;
            Node colPrev = colNode[c];
            int colPrevLen = colLen[c];
            int across = close(rowNode, rowLen);
            int down = close(colPrev, colPrevLen);
            if (across == -2 || down == -2 || (down >= 0 && across >= 0 && clueKey[down] == clueKey[across])) return SKIP;
            g[cell] = CLUE;
            if (!cluesOk(cell)) {
                g[cell] = 0;
                return SKIP_NEAR_CLUES;
            }
            mark(across, down, true);
            colNode[c] = null;
            colLen[c] = 0;
            BitSet res = next(cell, null, 0);
            if (res == null) return null;
            g[cell] = 0;
            mark(across, down, false);
            colNode[c] = colPrev;
            colLen[c] = colPrevLen;
            return res;
        }

        /** Moves on, closing the row's word at its end and each column's word at the bottom. */
        BitSet next(int cell, Node rowNode, int rowLen) {
            int r = cell / w;
            int c = cell % w;
            boolean letter = g[cell] != CLUE;
            int across = c == w - 1 && letter && r > 0 ? close(rowNode, rowLen) : -1;
            int down = r == h - 1 && letter && c > 0 ? close(colNode[c], colLen[c]) : -1;
            if (across == -2 || down == -2 || (down >= 0 && across >= 0 && clueKey[down] == clueKey[across])) return SKIP;
            mark(across, down, true);
            BitSet res = c == w - 1 ? solve(cell + 1, null, 0) : solve(cell + 1, rowNode, rowLen);
            if (res == null) return null;
            mark(across, down, false);
            return res;
        }

        void mark(int across, int down, boolean on) {
            if (across >= 0) used[clueKey[across]] = on;
            if (down >= 0) used[clueKey[down]] = on;
        }

        /** The cells that decided this cell's row and column words so far, back to their clue cells. */
        BitSet runs(int r, int c) {
            BitSet b = new BitSet();
            for (int cc = c - 1; cc >= 0; cc--) {
                b.set(r * w + cc);
                if (g[r * w + cc] == CLUE) break;
            }
            for (int rr = r - 1; rr >= 0; rr--) {
                b.set(rr * w + c);
                if (g[rr * w + c] == CLUE) break;
            }
            return b;
        }

        /** The earlier cells near a clue cell, which decide whether the clue cells around hold a clue. */
        BitSet around(int cell) {
            BitSet b = new BitSet();
            int r = cell / w;
            int c = cell % w;
            for (int dr = -2; dr <= 2; dr++) {
                for (int dc = -2; dc <= 2; dc++) {
                    int rr = r + dr;
                    int cc = c + dc;
                    if (rr >= 0 && cc >= 0 && rr < h && cc < w && rr * w + cc < cell) b.set(rr * w + cc);
                }
            }
            return b;
        }

        /** The word a run closes: its entry, -1 for no word (0 or 1 letter), -2 if it cannot end here. */
        int close(Node node, int len) {
            if (len == 0) return -1;
            if (len == 1) return -2; // a lone letter inside the grid would have no clue
            if (node == null || node.entry < 0 || used[clueKey[node.entry]]) return -2;
            return node.entry;
        }

        /** Some word of {@code len} letters or more, up to {@code max}, goes on from this node. */
        boolean possible(Node n, int len, int max) {
            if (n == null) return false;
            int mask = n.lengths >>> len;
            if (max - len + 1 < 31) mask &= (1 << (max - len + 1)) - 1;
            return mask != 0;
        }

        /** How many words going through this node have between {@code len} and {@code max} letters. */
        int fitting(Node n, int len, int max) {
            int count = 0;
            for (int l = len; l <= Math.min(max, ArrowWords.MAX_LENGTH); l++) count += n.byLength[l];
            return count;
        }

        /**
         * Puts the letters to try in {@code order}, likelier first: many words that still fit (and theme
         * words) go on from them. Returns how many.
         */
        int letterOrder(int[] order, Node across, int acrossLen, int acrossMax, Node down, int downLen, int downMax) {
            int count = 0;
            for (int i = 0; i < 26; i++) {
                Node a = across.next[i];
                Node d = down.next[i];
                if (a == null || d == null) continue;
                double weight = Math.sqrt((double) fitting(a, acrossLen, acrossMax) * fitting(d, downLen, downMax))
                        + THEME_BONUS * (a.favored + d.favored);
                keys[i] = Math.log(rnd.nextDouble() + 1e-12) / weight; // weighted random order
                // Insertion by key, highest first (26 letters at most).
                int k = count++;
                while (k > 0 && keys[order[k - 1]] < keys[i]) {
                    order[k] = order[k - 1];
                    k--;
                }
                order[k] = i;
            }
            return count;
        }

        /** The clue cell just set leaves no clue cell (itself, above or to the left) without a clue. */
        boolean cluesOk(int cell) {
            int r = cell / w;
            int c = cell % w;
            return hostOk(r, c) && hostOk(r - 2, c) && hostOk(r, c - 2) && hostOk(r - 1, c) && hostOk(r, c - 1);
        }

        /** False when the cell is a clue cell that can no longer hold any clue. */
        boolean hostOk(int r, int c) {
            if (r < 0 || c < 0 || g[r * w + c] != CLUE) return true;
            if (r == 0 && c + 1 < w && g[c + 1] != CLUE) return true; // bent arrow down to the next column's word
            if (c == 0 && r + 1 < h && g[(r + 1) * w] != CLUE) return true; // bent arrow across to the next row's word
            return can(r, c, 0, 1) || can(r, c, 1, 0);
        }

        /** The clue cell at (r, c) may still start a word of two letters or more this way. */
        boolean can(int r, int c, int dr, int dc) {
            for (int k = 1; k <= 2; k++) {
                int rr = r + k * dr;
                int cc = c + k * dc;
                if (rr >= h || cc >= w) return false;
                char ch = g[rr * w + cc];
                if (ch == CLUE) return false;
            }
            return true;
        }

        /** Fewer clue cells first, then more theme words. */
        double score() {
            int clues = 0;
            for (char ch : g) if (ch == CLUE) clues++;
            int themed = 0;
            for (Placed p : words()) if (entries.get(p.entry).favored()) themed++;
            return -clues * 10 + themed * 3;
        }

        private record Placed(int entry, int clueCell, String dir, int start, int length) {
        }

        /** Every word of the grid with the cell of its clue. */
        List<Placed> words() {
            List<Placed> out = new ArrayList<>();
            for (int cell = 0; cell < g.length; cell++) {
                int r = cell / w;
                int c = cell % w;
                if (g[cell] == CLUE) continue;
                // A word across starts here.
                boolean startsAcross = (c == 0 || g[cell - 1] == CLUE) && c + 1 < w && g[cell + 1] != CLUE && r > 0;
                if (startsAcross) {
                    int clueCell = c == 0 ? cell - w : cell - 1; // first column: the clue above, bent arrow
                    out.add(placed(cell, clueCell, false));
                }
                boolean startsDown = (r == 0 || g[cell - w] == CLUE) && r + 1 < h && g[cell + w] != CLUE && c > 0;
                if (startsDown) {
                    int clueCell = r == 0 ? cell - 1 : cell - w; // first row: the clue to the left, bent arrow
                    out.add(placed(cell, clueCell, true));
                }
            }
            return out;
        }

        Placed placed(int start, int clueCell, boolean down) {
            int step = down ? w : 1;
            Node n = root;
            int len = 0;
            for (int cell = start; cell < g.length && g[cell] != CLUE; cell += step) {
                n = n.next[g[cell] - 'A'];
                len++;
                if (!down && (cell + 1) % w == 0) break;
            }
            return new Placed(n.entry, clueCell, down ? "down" : "right", start, len);
        }

        ArrowGrid toGrid() {
            List<ArrowGrid.Clue> clues = new ArrayList<>();
            for (Placed p : words()) {
                clues.add(new ArrowGrid.Clue(p.clueCell, p.dir, p.start, p.length, entries.get(p.entry).clue()));
            }
            clues.sort((a, b) -> a.cell() != b.cell() ? Integer.compare(a.cell(), b.cell()) : Integer.compare(a.start(), b.start()));
            return new ArrowGrid(w, h, new String(g).replace(CLUE, ArrowGrid.BLOCK), List.copyOf(clues));
        }
    }
}
