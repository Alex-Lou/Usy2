package com.memocat.push.dto;

/**
 * What the service worker receives (encrypted end-to-end to the device): who
 * did what, and a short excerpt of what was written when there is one (see Previews).
 */
public record PushPayload(String title, String body, String url, String tag) {
}
