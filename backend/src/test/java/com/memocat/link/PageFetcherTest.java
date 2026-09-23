package com.memocat.link;

import com.memocat.web.ContentValidationException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Runs against a local server; the address check is stubbed (the real one refuses loopback by design). */
class PageFetcherTest {

    private HttpServer server;
    private String base;
    private final UrlSafety safety = mock(UrlSafety.class);
    private final PageFetcher fetcher = new PageFetcher(safety);

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        route("/page", 200, "text/html; charset=utf-8", "<title>Salut</title>", null);
        route("/big", 200, "text/html", "x".repeat(10_000), null);
        route("/hop", 302, "text/html", "", "/page");
        route("/loop", 302, "text/html", "", "/loop");
        route("/evil", 302, "text/html", "", "http://169.254.169.254/latest/meta-data/");
        route("/gone", 404, "text/html", "nope", null);
        server.start();
        base = "http://127.0.0.1:" + server.getAddress().getPort();
        when(safety.check(anyString())).thenAnswer(inv -> URI.create(inv.getArgument(0)));
    }

    private void route(String path, int status, String type, String body, String location) {
        server.createContext(path, ex -> {
            byte[] b = body.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type", type);
            if (location != null) {
                ex.getResponseHeaders().add("Location", location);
            }
            ex.sendResponseHeaders(status, b.length == 0 ? -1 : b.length);
            if (b.length > 0) {
                ex.getResponseBody().write(b);
            }
            ex.close();
        });
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void readsPageWithItsType() {
        PageFetcher.Fetched f = fetcher.fetch(URI.create(base + "/page"), 1000, "text/html").orElseThrow();
        assertThat(new String(f.body(), StandardCharsets.UTF_8)).isEqualTo("<title>Salut</title>");
        assertThat(f.contentType()).startsWith("text/html");
    }

    @Test
    void readsNoMoreThanTheLimit() {
        assertThat(fetcher.fetch(URI.create(base + "/big"), 100, "text/html").orElseThrow().body()).hasSize(100);
    }

    @Test
    void followsRedirectsAndChecksEveryHop() {
        PageFetcher.Fetched f = fetcher.fetch(URI.create(base + "/hop"), 1000, "text/html").orElseThrow();
        assertThat(f.finalUri().getPath()).isEqualTo("/page");
    }

    @Test
    void redirectToAPrivateAddressIsRefused() {
        when(safety.check(contains("169.254"))).thenThrow(new ContentValidationException("Adresse non autorisée"));
        assertThatThrownBy(() -> fetcher.fetch(URI.create(base + "/evil"), 1000, "text/html"))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void givesUpOnRedirectLoopsAndErrors() {
        assertThat(fetcher.fetch(URI.create(base + "/loop"), 1000, "text/html")).isEqualTo(Optional.empty());
        assertThat(fetcher.fetch(URI.create(base + "/gone"), 1000, "text/html")).isEqualTo(Optional.empty());
    }
}
