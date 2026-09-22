package com.memocat.game;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MorpionLogicTest {

    private static List<String> board(String cells) {
        // 9 chars: 'X', 'O' or '.' for empty
        String[] arr = new String[9];
        for (int i = 0; i < 9; i++) {
            char c = cells.charAt(i);
            arr[i] = c == '.' ? null : String.valueOf(c);
        }
        return Arrays.asList(arr);
    }

    @Test
    void detectsRowWin() {
        assertThat(MorpionLogic.winner(board("XXX" + "OO." + "..."))).isEqualTo("X");
    }

    @Test
    void detectsColumnWin() {
        assertThat(MorpionLogic.winner(board("O.." + "O.X" + "OX."))).isEqualTo("O");
    }

    @Test
    void detectsDiagonalWin() {
        assertThat(MorpionLogic.winner(board("X.O" + ".X." + "O.X"))).isEqualTo("X");
    }

    @Test
    void noWinnerOnEmptyBoard() {
        assertThat(MorpionLogic.winner(board("........."))).isNull();
    }

    @Test
    void noWinnerOnMixedLine() {
        assertThat(MorpionLogic.winner(board("XOX" + "OXO" + "OXO"))).isNull();
    }

    @Test
    void isFullOnlyWhenNoEmptyCell() {
        assertThat(MorpionLogic.isFull(board("XOXOXOXOX"))).isTrue();
        assertThat(MorpionLogic.isFull(board("XOXOXOXO."))).isFalse();
    }
}
