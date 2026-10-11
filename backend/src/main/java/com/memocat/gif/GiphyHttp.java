package com.memocat.gif;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Optional;

/**
 * Talks to GIPHY, and only to it: every address (the API, a GIF's file, a redirect) must be https on
 * giphy.com or one of its subdomains, so no other server can be reached through the GIF search.
 */
@Component
public class GiphyHttp {

    private static final Logger log = LoggerFactory.getLogger(GiphyHttp.class);
    private static final int MAX_REDIRECTS = 3;

    private final HttpClient http = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    /** The body (at most {@code maxBytes}) of a GIPHY address, or empty when it cannot be had. */
    public Optional<byte[]> get(URI start, int maxBytes) {
        URI uri = start;
        for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
            if (!isGiphy(uri)) {
                log.warn("GIF: refused address outside GIPHY ({})", uri.getHost());
                return Optional.empty();
            }
            try {
                HttpRequest req = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10))
                        .header("User-Agent", "MemoCat").GET().build();
                HttpResponse<InputStream> res = http.send(req, HttpResponse.BodyHandlers.ofInputStream());
                int status = res.statusCode();
                if (status >= 300 && status < 400) {
                    res.body().close();
                    Optional<String> location = res.headers().firstValue("Location");
                    if (location.isEmpty()) return Optional.empty();
                    uri = uri.resolve(location.get());
                    continue;
                }
                try (InputStream in = res.body()) {
                    if (status < 200 || status >= 300) {
                        log.warn("GIF: GIPHY answered {}", status);
                        return Optional.empty();
                    }
                    byte[] body = in.readNBytes(maxBytes + 1);
                    if (body.length > maxBytes) {
                        log.warn("GIF: file larger than {} bytes, left out", maxBytes);
                        return Optional.empty();
                    }
                    return Optional.of(body);
                }
            } catch (IOException e) {
                log.warn("GIF: GIPHY unreachable ({})", e.getClass().getSimpleName());
                return Optional.empty();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    /** https on giphy.com or a subdomain (api., media., media0-4., i.), default port. */
    static boolean isGiphy(URI uri) {
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        return "https".equalsIgnoreCase(uri.getScheme()) && uri.getPort() == -1 && uri.getUserInfo() == null
                && (host.equals("giphy.com") || host.endsWith(".giphy.com"));
    }
}
