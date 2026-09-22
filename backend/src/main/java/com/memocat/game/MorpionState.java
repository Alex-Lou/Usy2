package com.memocat.game;

import java.util.ArrayList;
import java.util.List;

/** Serialized game state for Morpion (stored as jsonb). */
public class MorpionState {

    private List<String> board = new ArrayList<>(); // 9 cells: "X" | "O" | null
    private Long x;         // user id playing "X" (creator)
    private Long o;         // user id playing "O"
    private String xSpecies; // chosen companion for X's pieces
    private String oSpecies;

    public static MorpionState empty(Long x, Long o) {
        MorpionState s = new MorpionState();
        for (int i = 0; i < 9; i++) {
            s.board.add(null);
        }
        s.x = x;
        s.o = o;
        return s;
    }

    public List<String> getBoard() {
        return board;
    }

    public void setBoard(List<String> board) {
        this.board = board;
    }

    public Long getX() {
        return x;
    }

    public void setX(Long x) {
        this.x = x;
    }

    public Long getO() {
        return o;
    }

    public void setO(Long o) {
        this.o = o;
    }

    public String getXSpecies() {
        return xSpecies;
    }

    public void setXSpecies(String xSpecies) {
        this.xSpecies = xSpecies;
    }

    public String getOSpecies() {
        return oSpecies;
    }

    public void setOSpecies(String oSpecies) {
        this.oSpecies = oSpecies;
    }
}
