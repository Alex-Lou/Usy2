package com.memocat.game.dto;

import java.util.List;

/** Combined payload broadcast to both players: the current game + the scoreboard. */
public record GamesStateDto(String type, GameDto game, List<ScoreDto> scores) {
}
