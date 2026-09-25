package com.memocat.couple.dto;

import java.time.LocalDate;
import java.util.List;

/** The shared space at a glance: since when, each person's mood and latest note. */
public record CoupleDto(LocalDate togetherSince, List<MoodDto> moods, List<NoteDto> latestNotes) {
}
