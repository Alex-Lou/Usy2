package com.memocat.crossword;

import java.util.List;

/**
 * A generated "mots fléchés" grid. {@code solution} has one character per cell,
 * row by row: a letter (A-Z), or {@code #} for a cell that holds no letter (a
 * clue cell or an empty one). Each clue sits in a cell next to its answer: its
 * word starts in the cell to the right ({@code right}) or below ({@code down}).
 */
public record ArrowGrid(int width, int height, String solution, List<Clue> clues) {

    public static final char BLOCK = '#';

    /** {@code cell}: where the clue is written; {@code start}: the answer's first letter. */
    public record Clue(int cell, String dir, int start, int length, String text) {
    }
}
