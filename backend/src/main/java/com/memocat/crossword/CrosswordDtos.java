package com.memocat.crossword;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class CrosswordDtos {

    private CrosswordDtos() {
    }

    public record CreateRequest(String size, boolean shared, String theme, String level) {
    }

    /** {@code letter}: one letter, or empty to erase; {@code reveal}: put the right letter instead. */
    public record Change(int cell, String letter, boolean reveal) {
    }

    public record PlayRequest(List<Change> changes) {
    }

    /**
     * A grid and where it stands. {@code solution} is sent too: the app checks words and reveals
     * letters itself (it is a game between the two of us). See V45 for the cell strings.
     */
    public record GameDto(Long id, String size, String theme, String level, boolean shared, Long ownerId, String ownerName, int width, int height,
                          List<ArrowGrid.Clue> clues, String solution, String letters, String authors,
                          Instant createdAt, Instant updatedAt, Instant finishedAt, LocalDate daily) {
    }

    /** In the list of grids: {@code progress} is the share of filled cells, in %. */
    public record SummaryDto(Long id, String size, String theme, String level, boolean shared, String ownerName, boolean mine, int progress,
                             Instant createdAt, Instant updatedAt, Instant finishedAt, LocalDate daily) {
    }

    /**
     * Today's grid: its level, the grid once one of us opened it ({@code gameId}, else null), how far it is,
     * and {@code streak}: the days in a row with the grid of the day finished (today's counts once done).
     */
    public record DailyDto(LocalDate date, String level, Long gameId, int progress, boolean finished, int streak) {
    }

    public record CellDto(int cell, String letter, char author) {
    }

    /** What /topic/crossword says when someone typed in a shared grid. */
    public record PingDto(Long gameId, boolean shared, Long by, List<CellDto> cells, Instant finishedAt) {
    }
}
