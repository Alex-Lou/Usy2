package com.memocat.news.dto;

/** A news site one can turn on (see NewsCatalog). */
public record NewsSourceDto(String id, String label, String site) {
}
