package com.memocat.news.dto;

/** A channel found by a YouTube search: its id (what is saved), name, @handle, picture and audience. */
public record YoutubeChannelDto(String id, String title, String handle, String image, String subscribers) {
}
