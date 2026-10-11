package com.memocat.gif;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.asset.AssetService;
import com.memocat.asset.dto.AssetDto;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GifServiceTest {

    private static final String PAGE = """
            {"data":[
              {"id":"abc123","title":"Chat qui danse","images":{"fixed_width":{"url":"https://media2.giphy.com/media/abc123/200w.gif","webp":"https://media2.giphy.com/media/abc123/200w.webp","width":"200","height":"150"}}},
              {"id":"evil","title":"x","images":{"fixed_width":{"url":"https://evil.example/x.gif"}}}
            ],"pagination":{"total_count":100,"count":2,"offset":0}}""";

    private final GiphyHttp http = mock(GiphyHttp.class);
    private final AssetService assets = mock(AssetService.class);
    private final List<URI> called = new ArrayList<>();

    private GifService service(String key) {
        return new GifService(http, assets, new ObjectMapper(), key, Clock.fixed(Instant.parse("2026-10-11T10:00:00Z"), ZoneOffset.UTC));
    }

    private void answer(String body) {
        when(http.get(any(), anyInt())).thenAnswer(inv -> {
            called.add(inv.getArgument(0));
            return Optional.of(body.getBytes(StandardCharsets.UTF_8));
        });
    }

    /** Without a key, nothing goes out: the app shows the phone's GIFs only. */
    @Test
    void offWithoutAKey() {
        GifService off = service(" ");
        assertThat(off.enabled()).isFalse();
        assertThatThrownBy(() -> off.find("chat", 0)).isInstanceOf(ResponseStatusException.class);
        verify(http, never()).get(any(), anyInt());
    }

    /** A search: the previews (GIPHY only, anything else left out), the next page, and kept a while. */
    @Test
    void searchesAndKeepsTheResults() {
        answer(PAGE);
        GifService gifs = service("KEY");

        GifService.GifPage page = gifs.find("  chat  ", 0);

        assertThat(page.gifs()).extracting(GifService.Gif::id).containsExactly("abc123");
        assertThat(page.gifs().get(0).preview()).endsWith("200w.webp");
        assertThat(page.gifs().get(0).width()).isEqualTo(200);
        assertThat(page.next()).isEqualTo(2);
        URI uri = called.get(0);
        assertThat(uri.getHost()).isEqualTo("api.giphy.com");
        assertThat(uri.getPath()).isEqualTo("/v1/gifs/search");
        assertThat(uri.getQuery()).contains("q=chat", "api_key=KEY", "rating=pg-13");

        gifs.find("Chat", 0);
        assertThat(called).hasSize(1); // the same search again: from what was kept
        gifs.find("", 0);
        assertThat(called.get(1).getPath()).isEqualTo("/v1/gifs/trending");
    }

    /** A GIF picked is fetched from GIPHY and kept as the user's own image. */
    @Test
    void savesTheGifPicked() {
        GifService gifs = service("KEY");
        when(http.get(any(), anyInt())).thenAnswer(inv -> {
            URI uri = inv.getArgument(0);
            String body = uri.getHost().equals("api.giphy.com")
                    ? "{\"data\":{\"images\":{\"downsized\":{\"url\":\"https://media1.giphy.com/media/abc123/giphy-downsized.gif\"}}}}"
                    : "GIF89a....";
            return Optional.of(body.getBytes(StandardCharsets.UTF_8));
        });
        AssetDto stored = new AssetDto(7L, "image/gif", 10, "gif-abc123.gif", null, 200, 150);
        when(assets.storeGif(eq("lou"), any(), eq("gif-abc123.gif"))).thenReturn(stored);

        assertThat(gifs.save("lou", "abc123")).isSameAs(stored);
    }

    /** An id that is not a GIPHY id (a path, a URL) is refused before anything goes out. */
    @Test
    void refusesAStrangeId() {
        GifService gifs = service("KEY");
        assertThatThrownBy(() -> gifs.save("lou", "../../secret")).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> gifs.save("lou", "https://evil.example")).isInstanceOf(ContentValidationException.class);
        verify(http, never()).get(any(), anyInt());
    }

    /** Only GIPHY, over https, can be reached. */
    @Test
    void onlyGiphyCanBeReached() {
        assertThat(GiphyHttp.isGiphy(URI.create("https://media3.giphy.com/media/x/200w.gif"))).isTrue();
        assertThat(GiphyHttp.isGiphy(URI.create("https://giphy.com/x"))).isTrue();
        assertThat(GiphyHttp.isGiphy(URI.create("http://media.giphy.com/x"))).isFalse();
        assertThat(GiphyHttp.isGiphy(URI.create("https://giphy.com.evil.example/x"))).isFalse();
        assertThat(GiphyHttp.isGiphy(URI.create("https://evilgiphy.com/x"))).isFalse();
        assertThat(GiphyHttp.isGiphy(URI.create("https://user@media.giphy.com/x"))).isFalse();
        assertThat(GiphyHttp.isGiphy(URI.create("https://media.giphy.com:8443/x"))).isFalse();
        assertThat(GiphyHttp.isGiphy(URI.create("https://169.254.169.254/latest"))).isFalse();
    }
}
