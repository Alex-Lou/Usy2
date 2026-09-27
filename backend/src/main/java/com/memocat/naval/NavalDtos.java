package com.memocat.naval;

import java.util.List;

/** 🚢 What the battleship API sends: each one only ever sees the other's ships once sunk (or the game over). */
public final class NavalDtos {

    private NavalDtos() {
    }

    /** {@code theme}: only used for the very first game (then the last winner's pick applies). */
    public record Create(String theme) {
    }

    /** One ship: its first (top-left) cell 0..99 and its direction. */
    public record Ship(int cell, boolean vertical) {
    }

    /** The 5 ships, in the order of {@link NavalService#LENGTHS}. */
    public record Fleet(List<Ship> ships) {
    }

    public record Shoot(int cell) {
    }

    public record Theme(String theme) {
    }

    /** {@code type}: index in {@link NavalService#LENGTHS} (porte-avions, cuirassé, croiseur, sous-marin, torpilleur). */
    public record ShipView(int type, List<Integer> cells, boolean sunk) {
    }

    public record Shot(int cell, boolean hit) {
    }

    /** The latest shot of the game, for its animation ({@code sunk}: the ship type it sank, if it did). */
    public record LastShot(long by, int cell, boolean hit, Integer sunk) {
    }

    /**
     * The game as {@code me} sees it: my fleet and the other's shots at it, my
     * shots at theirs, and their ships only once sunk (all of them once over).
     * {@code nextTheme}: the theme the next game will use.
     */
    public record View(long id, String theme, String nextTheme, String status, long hostId, String hostName,
                       long guestId, String guestName, long meId, Long turnId, Long winnerId, String endedReason,
                       boolean mePlaced, boolean themPlaced, List<ShipView> myFleet, List<ShipView> theirShips,
                       List<Shot> myShots, List<Shot> theirShots, int shots, LastShot last, long myWins, long theirWins) {
    }

    /** What /topic/naval says: that a game changed, never where the ships are (each phone asks for its own view). */
    public record Ping(long id, String status, Long turnId, Long winnerId, long hostId, String hostName, long guestId,
                       String guestName, int shots, boolean hit) {
    }
}
