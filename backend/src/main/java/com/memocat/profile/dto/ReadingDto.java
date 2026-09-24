package com.memocat.profile.dto;

/** How the current person reads the messages: font key and size (s/m/l/xl); null = default. */
public record ReadingDto(String font, String size) {
}
