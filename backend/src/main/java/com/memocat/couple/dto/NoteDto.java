package com.memocat.couple.dto;

import com.memocat.auth.dto.UserDto;
import com.memocat.domain.CoupleNote;

import java.time.Instant;

public record NoteDto(Long id, UserDto author, String text, Instant createdAt) {

    public static NoteDto from(CoupleNote note) {
        return new NoteDto(note.getId(), UserDto.from(note.getAuthor()), note.getText(), note.getCreatedAt());
    }
}
