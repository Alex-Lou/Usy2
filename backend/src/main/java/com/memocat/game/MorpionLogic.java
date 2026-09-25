package com.memocat.game;

import java.util.List;

/** Pure rules for Morpion (tic-tac-toe). Server-authoritative. */
public final class MorpionLogic {

    private static final int[][] LINES = {
            {0, 1, 2}, {3, 4, 5}, {6, 7, 8}, // rows
            {0, 3, 6}, {1, 4, 7}, {2, 5, 8}, // cols
            {0, 4, 8}, {2, 4, 6},            // diagonals
    };

    private MorpionLogic() {
    }

    /** @return "X" or "O" if that mark has a winning line, else null. */
    public static String winner(List<String> board) {
        for (int[] line : LINES) {
            String a = board.get(line[0]);
            if (a != null && a.equals(board.get(line[1])) && a.equals(board.get(line[2]))) {
                return a;
            }
        }
        return null;
    }

    public static boolean isFull(List<String> board) {
        return board.stream().allMatch(c -> c != null);
    }
}
