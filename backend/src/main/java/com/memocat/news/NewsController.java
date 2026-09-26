package com.memocat.news;

import com.memocat.news.dto.NewsItemDto;
import com.memocat.news.dto.NewsSourceDto;
import com.memocat.profile.dto.NewsPrefsDto;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/** The "Actus" tab: my sources, my items, their pictures (signed-in users only, like all /api). */
@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsService news;

    public NewsController(NewsService news) {
        this.news = news;
    }

    @GetMapping
    public List<NewsItemDto> items(Principal principal) {
        return news.items(principal.getName());
    }

    @GetMapping("/sources")
    public List<NewsSourceDto> sources() {
        return news.catalog();
    }

    @GetMapping("/prefs")
    public NewsPrefsDto prefs(Principal principal) {
        return news.prefs(principal.getName());
    }

    @PutMapping("/prefs")
    public NewsPrefsDto savePrefs(Principal principal, @RequestBody NewsPrefsDto prefs) {
        return news.savePrefs(principal.getName(), prefs);
    }

    /** My Reddit home feed: which account (the private link itself never leaves the server). */
    @GetMapping("/reddit-home")
    public Map<String, String> redditHome(Principal principal) {
        return news.redditHomeUser(principal.getName()).map(u -> Map.of("user", u)).orElse(Map.of());
    }

    @PutMapping("/reddit-home")
    public Map<String, String> saveRedditHome(Principal principal, @RequestBody Map<String, String> body) {
        return Map.of("user", news.saveRedditHome(principal.getName(), body == null ? null : body.get("url")));
    }

    @DeleteMapping("/reddit-home")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeRedditHome(Principal principal) {
        news.removeRedditHome(principal.getName());
    }

    @GetMapping("/image")
    public ResponseEntity<byte[]> image(@RequestParam String url) {
        return news.image(url)
                .map(f -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(f.contentType().split(";")[0].strip()))
                        .cacheControl(CacheControl.maxAge(Duration.ofHours(12)).cachePrivate())
                        .header("X-Content-Type-Options", "nosniff")
                        .body(f.body()))
                .orElse(ResponseEntity.notFound().build());
    }
}
