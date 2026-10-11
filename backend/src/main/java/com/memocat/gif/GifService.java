package com.memocat.gif;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.asset.AssetService;
import com.memocat.asset.dto.AssetDto;
import com.memocat.web.ContentValidationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * The GIF search (GIPHY): trending GIFs, or the ones matching a search, a page at a time; a GIF
 * picked is fetched by the server and kept as one of our own images, so it is sent and shown like a
 * photo (and stays even if GIPHY drops it). The key stays on the server (MEMOCAT_GIPHY_KEY); without
 * it the search answers 503 and the app shows the GIFs of the phone only. Results are kept a few
 * minutes: a beta key allows about 100 calls an hour.
 */
@Service
public class GifService {

    static final String API = "https://api.giphy.com/v1/gifs";
    static final int PAGE = 24;
    static final int MAX_GIF_BYTES = 8 * 1024 * 1024;
    private static final int MAX_JSON_BYTES = 2 * 1024 * 1024;
    private static final int MAX_QUERY = 50;
    private static final int MAX_OFFSET = 499; // GIPHY's own limit for a beta key
    private static final Duration KEEP = Duration.ofMinutes(10);
    private static final int MAX_KEPT = 200;
    private static final Pattern ID = Pattern.compile("[A-Za-z0-9]{1,64}");

    public record Gif(String id, String title, String preview, int width, int height) {
    }

    /** {@code next}: the offset of the next page, or null when there is none. */
    public record GifPage(List<Gif> gifs, Integer next) {
    }

    private record Kept(Instant at, GifPage page) {
    }

    private final GiphyHttp http;
    private final AssetService assets;
    private final ObjectMapper json;
    private final String key;
    private final Clock clock;
    private final Map<String, Kept> kept = new LinkedHashMap<>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Kept> eldest) {
            return size() > MAX_KEPT;
        }
    };

    @Autowired
    public GifService(GiphyHttp http, AssetService assets, ObjectMapper json,
                      @Value("${memocat.gif.giphy-key:}") String key) {
        this(http, assets, json, key, Clock.systemUTC());
    }

    GifService(GiphyHttp http, AssetService assets, ObjectMapper json, String key, Clock clock) {
        this.http = http;
        this.assets = assets;
        this.json = json;
        this.key = key == null ? "" : key.strip();
        this.clock = clock;
    }

    public boolean enabled() {
        return !key.isEmpty();
    }

    /** Trending GIFs (blank query) or a search, from {@code offset}. */
    public GifPage find(String query, int offset) {
        requireKey();
        String q = query == null ? "" : query.strip();
        if (q.length() > MAX_QUERY) q = q.substring(0, MAX_QUERY);
        int from = Math.max(0, Math.min(offset, MAX_OFFSET));
        String cacheKey = q.toLowerCase() + "|" + from;
        synchronized (kept) {
            Kept k = kept.get(cacheKey);
            if (k != null && k.at().plus(KEEP).isAfter(clock.instant())) return k.page();
        }
        UriComponentsBuilder url = UriComponentsBuilder.fromUriString(API + (q.isEmpty() ? "/trending" : "/search"))
                .queryParam("api_key", key)
                .queryParam("limit", PAGE)
                .queryParam("offset", from)
                .queryParam("rating", "pg-13")
                .queryParam("bundle", "messaging_non_clips");
        if (!q.isEmpty()) url.queryParam("q", q).queryParam("lang", "fr");
        JsonNode root = call(url.encode().build().toUri());
        List<Gif> gifs = new ArrayList<>();
        for (JsonNode g : root.path("data")) {
            JsonNode small = g.path("images").path("fixed_width");
            String preview = small.path("webp").asText(small.path("url").asText(""));
            String id = g.path("id").asText("");
            if (preview.isEmpty() || !ID.matcher(id).matches() || !GiphyHttp.isGiphy(URI.create(preview))) continue;
            gifs.add(new Gif(id, g.path("title").asText(""), preview, small.path("width").asInt(200),
                    small.path("height").asInt(200)));
        }
        JsonNode p = root.path("pagination");
        int nextOffset = p.path("offset").asInt(from) + p.path("count").asInt(gifs.size());
        boolean more = !gifs.isEmpty() && nextOffset < p.path("total_count").asInt(0) && nextOffset <= MAX_OFFSET;
        GifPage page = new GifPage(gifs, more ? nextOffset : null);
        synchronized (kept) {
            kept.put(cacheKey, new Kept(clock.instant(), page));
        }
        return page;
    }

    /** The GIF {@code id}, fetched from GIPHY and stored as one of {@code username}'s images. */
    public AssetDto save(String username, String id) {
        requireKey();
        if (id == null || !ID.matcher(id).matches()) throw new ContentValidationException("GIF inconnu");
        JsonNode images = call(UriComponentsBuilder.fromUriString(API + "/{id}").queryParam("api_key", key)
                .buildAndExpand(id).encode().toUri()).path("data").path("images");
        // The lightest version that still looks good in a conversation (GIPHY keeps it under 2 Mo).
        String file = images.path("downsized").path("url").asText(images.path("fixed_width").path("url").asText(""));
        if (file.isEmpty()) throw new ContentValidationException("GIF inconnu");
        byte[] bytes = http.get(URI.create(file), MAX_GIF_BYTES)
                .orElseThrow(() -> new ContentValidationException("Ce GIF n'a pas pu être récupéré, réessaie"));
        return assets.storeGif(username, bytes, "gif-" + id + ".gif");
    }

    private JsonNode call(URI uri) {
        byte[] body = http.get(uri, MAX_JSON_BYTES)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GIPHY ne répond pas"));
        try {
            return json.readTree(body);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GIPHY ne répond pas");
        }
    }

    private void requireKey() {
        if (!enabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Recherche de GIFs non configurée");
    }
}
