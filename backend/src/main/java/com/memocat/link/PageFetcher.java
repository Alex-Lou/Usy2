package com.memocat.link;

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
 * Downloads a page or an image for a link preview: redirects are followed by
 * hand (at most 4) so every hop goes through {@link UrlSafety}; bodies are
 * capped; failures return empty (a preview is a nice-to-have). Logs only the
 * host, never the full URL.
 */
@Component
public class PageFetcher {

    private static final Logger log = LoggerFactory.getLogger(PageFetcher.class);
    private static final int MAX_REDIRECTS = 4;
    // Many sites (YouTube, Instagram, news…) only hand their title/image tags to the link-preview
    // robots they know; this is the one WhatsApp and Facebook use.
    private static final String USER_AGENT = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

    public record Fetched(URI finalUri, String contentType, byte[] body) {
    }

    private final UrlSafety safety;
    private final HttpClient http = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER)
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    public PageFetcher(UrlSafety safety) {
        this.safety = safety;
    }

    public Optional<Fetched> fetch(URI start, int maxBytes, String accept) {
        URI uri = start;
        for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
            uri = safety.check(uri.toString());
            try {
                HttpRequest req = HttpRequest.newBuilder(uri)
                        .timeout(Duration.ofSeconds(6))
                        .header("User-Agent", USER_AGENT)
                        .header("Accept", accept)
                        .header("Accept-Language", "fr,en;q=0.8")
                        .GET()
                        .build();
                HttpResponse<InputStream> res = http.send(req, HttpResponse.BodyHandlers.ofInputStream());
                int status = res.statusCode();
                if (status >= 300 && status < 400) {
                    res.body().close();
                    Optional<String> location = res.headers().firstValue("Location");
                    if (location.isEmpty()) {
                        return Optional.empty();
                    }
                    uri = uri.resolve(location.get());
                    continue;
                }
                try (InputStream in = res.body()) {
                    if (status < 200 || status >= 300) {
                        log.debug("Link preview: {} answered {}", uri.getHost(), status);
                        return Optional.empty();
                    }
                    String type = res.headers().firstValue("Content-Type").orElse("").toLowerCase(Locale.ROOT);
                    byte[] body = in.readNBytes(maxBytes);
                    return Optional.of(new Fetched(uri, type, body));
                }
            } catch (IOException e) {
                log.debug("Link preview: {} unreachable ({})", uri.getHost(), e.getClass().getSimpleName());
                return Optional.empty();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return Optional.empty();
            }
        }
        return Optional.empty();
    }
}
