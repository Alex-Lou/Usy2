package com.memocat.push.dto;

/**
 * What the service worker receives (encrypted end-to-end to the device). Only
 * who did what — never message or post content — since it lands on a lock screen.
 */
public record PushPayload(String title, String body, String url, String tag) {
}
