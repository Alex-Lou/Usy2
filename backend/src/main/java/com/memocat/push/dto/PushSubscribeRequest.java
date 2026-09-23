package com.memocat.push.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Shape of the browser's PushSubscription.toJSON(). */
public record PushSubscribeRequest(
        @NotBlank @Size(max = 1024) String endpoint,
        @NotNull @Valid Keys keys) {

    public record Keys(
            @NotBlank @Size(max = 200) String p256dh,
            @NotBlank @Size(max = 100) String auth) {
    }
}
