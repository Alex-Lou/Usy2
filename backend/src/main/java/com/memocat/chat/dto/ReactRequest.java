package com.memocat.chat.dto;

/** Body of PUT /api/messages/{id}/reaction; a null or empty emoji removes mine. */
public record ReactRequest(String emoji) {
}
