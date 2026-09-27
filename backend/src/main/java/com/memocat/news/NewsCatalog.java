package com.memocat.news;

import java.util.List;
import java.util.Optional;

/**
 * The news sites anyone can turn on in their "Actus" tab: tech and games,
 * articles rather than ads. Fixed list (the server only ever fetches these
 * feeds, plus the public accounts people follow).
 */
public final class NewsCatalog {

    public record Source(String id, String label, String site, String feed) {
    }

    public static final List<Source> SOURCES = List.of(
            new Source("korben", "Korben", "https://korben.info", "https://korben.info/feed"),
            new Source("numerama", "Numerama", "https://www.numerama.com", "https://www.numerama.com/feed/"),
            new Source("jvcom", "Jeuxvideo.com", "https://www.jeuxvideo.com", "https://www.jeuxvideo.com/rss/rss.xml"),
            new Source("next", "Next", "https://next.ink", "https://next.ink/feed/"),
            new Source("jdg", "Journal du Geek", "https://www.journaldugeek.com", "https://www.journaldugeek.com/feed/"),
            new Source("frandroid", "Frandroid", "https://www.frandroid.com", "https://www.frandroid.com/feed"),
            new Source("gamekult", "Gamekult", "https://www.gamekult.com", "https://www.gamekult.com/feed.xml"),
            new Source("ars", "Ars Technica", "https://arstechnica.com", "https://feeds.arstechnica.com/arstechnica/index"),
            new Source("verge", "The Verge", "https://www.theverge.com", "https://www.theverge.com/rss/index.xml"));

    private NewsCatalog() {
    }

    public static Optional<Source> find(String id) {
        return SOURCES.stream().filter(s -> s.id().equals(id)).findFirst();
    }
}
