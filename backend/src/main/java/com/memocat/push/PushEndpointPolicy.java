package com.memocat.push;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * The server POSTs to whatever endpoint a browser registered, so endpoints are
 * restricted to the known browser push services (prevents SSRF: no internal
 * hosts, no plain HTTP, no credentials or odd ports in the URL).
 */
final class PushEndpointPolicy {

    static final int MAX_LENGTH = 1024;

    private static final Set<String> HOSTS = Set.of(
            "fcm.googleapis.com",                 // Chrome, Edge (Android), Samsung, Opera, Brave
            "updates.push.services.mozilla.com",  // Firefox
            "web.push.apple.com");                // Safari (macOS, iOS home-screen apps)
    private static final List<String> HOST_SUFFIXES = List.of(
            ".push.apple.com",
            ".push.services.mozilla.com",
            ".notify.windows.com");               // Edge (Windows)

    private PushEndpointPolicy() {
    }

    static boolean isAllowed(String endpoint) {
        if (endpoint == null || endpoint.length() > MAX_LENGTH) {
            return false;
        }
        URI uri;
        try {
            uri = new URI(endpoint);
        } catch (URISyntaxException e) {
            return false;
        }
        if (!"https".equals(uri.getScheme()) || uri.getRawUserInfo() != null || uri.getHost() == null) {
            return false;
        }
        if (uri.getPort() != -1 && uri.getPort() != 443) {
            return false;
        }
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        return HOSTS.contains(host) || HOST_SUFFIXES.stream().anyMatch(host::endsWith);
    }
}
