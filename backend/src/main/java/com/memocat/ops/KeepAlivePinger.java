package com.memocat.ops;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Keeps a free Render instance awake by periodically requesting the app's own
 * PUBLIC URL. The request leaves the instance and re-enters through Render's
 * edge, so it counts as inbound traffic and resets the ~15 min idle timer.
 *
 * Render injects {@code RENDER_EXTERNAL_URL} automatically, so this needs no
 * configuration there; elsewhere (local dev, tests) the URL is empty and the
 * pinger does nothing. Failures are logged, never thrown.
 */
@Component
public class KeepAlivePinger {

    private static final Logger log = LoggerFactory.getLogger(KeepAlivePinger.class);

    private final String url;
    private final RestClient http;

    public KeepAlivePinger(@Value("${memocat.keep-alive.url:}") String url) {
        String trimmed = url == null ? "" : url.strip();
        this.url = trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(30_000);
        this.http = RestClient.builder().requestFactory(factory).build();
    }

    boolean enabled() {
        return !url.isEmpty();
    }

    String target() {
        return url + "/";
    }

    /** Every 10 min (well under Render's 15 min idle window), first run 2 min after boot. */
    @Scheduled(initialDelay = 120_000, fixedDelay = 600_000)
    public void ping() {
        if (!enabled()) {
            return;
        }
        try {
            http.get().uri(target()).retrieve().toBodilessEntity();
            log.debug("Keep-alive ping OK: {}", target());
        } catch (Exception e) {
            log.warn("Keep-alive ping failed ({}): {}", target(), e.getMessage());
        }
    }
}
