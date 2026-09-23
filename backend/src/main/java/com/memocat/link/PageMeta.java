package com.memocat.link;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Title, description, site name and image of an HTML page (Open Graph first). */
public record PageMeta(String title, String description, String siteName, URI image) {

    private static final Pattern CHARSET = Pattern.compile("charset=([\\w.-]+)", Pattern.CASE_INSENSITIVE);

    public static PageMeta parse(byte[] html, String contentType, URI base) {
        Document doc;
        try {
            doc = Jsoup.parse(new ByteArrayInputStream(html), charsetOf(contentType), base.toString());
        } catch (IOException e) {
            return new PageMeta(null, null, null, null);
        }
        String title = first(doc, "meta[property=og:title]", "meta[name=twitter:title]");
        if (title == null) {
            title = clean(doc.title());
        }
        String description = first(doc, "meta[property=og:description]", "meta[name=description]",
                "meta[name=twitter:description]");
        String site = first(doc, "meta[property=og:site_name]");
        URI image = null;
        Element img = doc.selectFirst("meta[property=og:image], meta[property=og:image:url], meta[name=twitter:image]");
        if (img != null) {
            String abs = img.absUrl("content");
            try {
                // http(s) only; the fetcher checks the address again before downloading
                image = abs.startsWith("https://") || abs.startsWith("http://") ? URI.create(abs) : null;
            } catch (IllegalArgumentException ignored) {
                image = null;
            }
        }
        return new PageMeta(cut(title, 300), cut(description, 600), cut(site, 120), image);
    }

    private static String charsetOf(String contentType) {
        Matcher m = CHARSET.matcher(contentType == null ? "" : contentType);
        if (m.find()) {
            try {
                return Charset.forName(m.group(1)).name();
            } catch (IllegalArgumentException ignored) {
                return StandardCharsets.UTF_8.name();
            }
        }
        return null; // let jsoup sniff <meta charset>
    }

    private static String first(Document doc, String... selectors) {
        for (String s : selectors) {
            Element e = doc.selectFirst(s);
            if (e != null) {
                String v = clean(e.attr("content"));
                if (v != null) {
                    return v;
                }
            }
        }
        return null;
    }

    private static String clean(String v) {
        if (v == null) {
            return null;
        }
        String t = v.replaceAll("\\s+", " ").strip();
        return t.isEmpty() ? null : t;
    }

    private static String cut(String v, int max) {
        return v == null || v.length() <= max ? v : v.substring(0, max - 1) + "…";
    }

    static boolean isHtml(String contentType) {
        String t = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        return t.startsWith("text/html") || t.startsWith("application/xhtml");
    }
}
