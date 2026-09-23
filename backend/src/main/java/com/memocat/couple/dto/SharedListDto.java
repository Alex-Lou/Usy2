package com.memocat.couple.dto;

import java.time.Instant;
import java.util.List;

public record SharedListDto(Long id, String name, Instant createdAt, List<ListItemDto> items) {

    public record ListItemDto(Long id, String text, boolean done, Long createdById, Instant createdAt) {
    }
}
