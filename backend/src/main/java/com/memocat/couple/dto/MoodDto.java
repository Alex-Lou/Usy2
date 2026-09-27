package com.memocat.couple.dto;

import com.memocat.domain.Mood;

import java.time.Instant;

public record MoodDto(Long userId, String emoji, String label, Instant updatedAt) {

    public static MoodDto from(Mood mood) {
        return new MoodDto(mood.getUserId(), mood.getEmoji(), mood.getLabel(), mood.getUpdatedAt());
    }
}
