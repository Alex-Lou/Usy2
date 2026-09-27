package com.memocat.game.dto;

public record ScoreDto(Long userId, String displayName, int wins, int draws, int losses) {
}
