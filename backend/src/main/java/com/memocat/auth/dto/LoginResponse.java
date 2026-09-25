package com.memocat.auth.dto;

import java.time.Instant;

public record LoginResponse(String token, Instant expiresAt, UserDto user) {
}
