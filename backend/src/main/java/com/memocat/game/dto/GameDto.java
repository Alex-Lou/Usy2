package com.memocat.game.dto;

import java.util.List;

public record GameDto(
        Long id,
        String type,
        String status,
        List<String> board,
        Long turnUserId,
        Long winnerUserId,
        boolean draw,
        Long x,
        Long o,
        String xSpecies,
        String oSpecies) {
}
