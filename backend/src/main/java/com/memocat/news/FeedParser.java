package com.memocat.news;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads what the sources send back: RSS 2.0 and Atom feeds (news sites,
 * Mastodon, Reddit), Bluesky's public author feed and one post from
 * FxTwitter. Never trusts the markup: text is stripped to plain text and
 * only http(s) links are kept. XML is parsed with DTDs and external
 * entities turned off.
 */
public final class FeedParser {

    /** An entry, before it is labelled with its source. */
    public record Entry(String title, String text, String url, String image, String author, Instant publishedAt) {
    }

    static final int MAX_ENTRIES = 12;
    static final int MAX_TEXT = 280;
    private static final Pattern IMG = Pattern.compile("<img[^>]+src=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);
    private static final Pattern TAG = Pattern.compile("<[^>]*>");
    private static final Pattern SPACES = Pattern.compile("\\s+");
    private static final Pattern FEED_LINK = Pattern.compile("<link[^>]+type=[\"']application/(?:rss|atom)\\+xml[\"'][^>]*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern HREF = Pattern.compile("href=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);
    private static final Pattern YOUTUBE_VIDEO = Pattern.compile("(?:[?&]v=|/shorts/)([A-Za-z0-9_-]{11})");
    private static final ObjectMapper JSON = new ObjectMapper();

    private FeedParser() {
    }

    /** RSS 2.0 or Atom. */
    public static List<Entry> parseFeed(byte[] body) {
        Document doc = xml(body);
        List<Entry> out = new ArrayList<>();
        NodeList items = doc.getElementsByTagName("item");
        if (items.getLength() > 0) {
            for (int i = 0; i < items.getLength() && out.size() < MAX_ENTRIES; i++) {
                Element it = (Element) items.item(i);
                String html = firstText(it, "content:encoded", "description");
                out.add(new Entry(
                        clean(firstText(it, "title"), 200),
                        clean(html, MAX_TEXT),
                        safeUrl(firstText(it, "link")),
                        safeUrl(image(it, html)),
                        clean(firstText(it, "dc:creator", "author"), 80),
                        date(firstText(it, "pubDate", "dc:date"))));
            }
            return out;
        }
        NodeList entries = doc.getElementsByTagName("entry");
        for (int i = 0; i < entries.getLength() && out.size() < MAX_ENTRIES; i++) {
            Element e = (Element) entries.item(i);
            String html = firstText(e, "content", "summary");
            Element author = firstElement(e, "author");
            out.add(new Entry(
                    clean(firstText(e, "title"), 200),
                    clean(html, MAX_TEXT),
                    safeUrl(atomLink(e)),
                    safeUrl(image(e, html)),
                    author == null ? null : clean(firstText(author, "name"), 80),
                    date(firstText(e, "published", "updated"))));
        }
        return out;
    }

    /** A channel's Shorts playlist feed: each entry points at its Short (youtube.com/shorts/ID). */
    public static List<Entry> parseYoutubeShorts(byte[] body) {
        List<Entry> out = new ArrayList<>();
        for (Entry e : parseFeed(body)) {
            Matcher m = YOUTUBE_VIDEO.matcher(e.url() == null ? "" : e.url());
            if (m.find()) {
                out.add(new Entry(e.title(), null, "https://www.youtube.com/shorts/" + m.group(1), e.image(), e.author(), e.publishedAt()));
            }
        }
        return out;
    }

    /**
     * The channels on a YouTube search page (channels filter): read from the
     * page's own data (ytInitialData), at most {@code max}. Nothing found (or a
     * page YouTube changed) gives an empty list.
     */
    public static List<com.memocat.news.dto.YoutubeChannelDto> parseYoutubeChannels(byte[] html, int max) {
        String page = new String(html, java.nio.charset.StandardCharsets.UTF_8);
        int marker = page.indexOf("ytInitialData");
        int start = marker < 0 ? -1 : page.indexOf('{', marker);
        if (start < 0) {
            return List.of();
        }
        JsonNode data;
        try {
            data = JSON.readTree(page.substring(start)); // the first object; what follows is ignored
        } catch (Exception e) {
            return List.of();
        }
        List<com.memocat.news.dto.YoutubeChannelDto> out = new ArrayList<>();
        collectChannels(data, out, max);
        return out;
    }

    private static void collectChannels(JsonNode node, List<com.memocat.news.dto.YoutubeChannelDto> out, int max) {
        if (out.size() >= max || node == null || !node.isContainerNode()) {
            return;
        }
        JsonNode c = node.get("channelRenderer");
        if (c != null) {
            String id = c.path("channelId").asText("");
            if (id.matches("UC[A-Za-z0-9_-]{22}") && out.stream().noneMatch(x -> x.id().equals(id))) {
                String base = c.path("navigationEndpoint").path("browseEndpoint").path("canonicalBaseUrl").asText("");
                String handle = base.startsWith("/@") ? base.substring(1) : null;
                String subscribers = null;
                for (String field : List.of("subscriberCountText", "videoCountText")) {
                    String t = c.path(field).path("simpleText").asText("");
                    if (handle == null && t.startsWith("@")) {
                        handle = t;
                    } else if (subscribers == null && t.matches("(?i).*(abonn|subscriber).*")) {
                        subscribers = t;
                    }
                }
                JsonNode thumbs = c.path("thumbnail").path("thumbnails");
                String image = thumbs.isArray() && !thumbs.isEmpty() ? thumbs.get(thumbs.size() - 1).path("url").asText(null) : null;
                if (image != null && image.startsWith("//")) {
                    image = "https:" + image;
                }
                out.add(new com.memocat.news.dto.YoutubeChannelDto(id, clean(c.path("title").path("simpleText").asText(""), 80),
                        handle == null ? null : clean(handle, 40), safeUrl(image), subscribers == null ? null : clean(subscribers, 40)));
            }
        }
        for (JsonNode child : node) {
            collectChannels(child, out, max);
        }
    }

    /** app.bsky.feed.getAuthorFeed: the account's own recent posts. */
    public static List<Entry> parseBluesky(byte[] body) {
        List<Entry> out = new ArrayList<>();
        for (JsonNode item : read(body).path("feed")) {
            if (out.size() >= MAX_ENTRIES) {
                break;
            }
            JsonNode post = item.path("post");
            if (!item.path("reason").isMissingNode()) {
                continue; // reposts of other accounts
            }
            String handle = post.path("author").path("handle").asText("");
            String uri = post.path("uri").asText("");
            String rkey = uri.substring(uri.lastIndexOf('/') + 1);
            JsonNode images = post.path("embed").path("images");
            String image = images.isArray() && !images.isEmpty() ? images.get(0).path("thumb").asText(null) : null;
            String name = post.path("author").path("displayName").asText("");
            out.add(new Entry(null,
                    clean(post.path("record").path("text").asText(""), MAX_TEXT),
                    handle.isEmpty() || rkey.isEmpty() ? null : safeUrl("https://bsky.app/profile/" + handle + "/post/" + rkey),
                    safeUrl(image),
                    clean(name.isBlank() ? "@" + handle : name, 80),
                    date(post.path("record").path("createdAt").asText(null))));
        }
        return out;
    }

    /** One post from api.fxtwitter.com/{user}/status/{id}. */
    public static List<Entry> parseFxTweet(byte[] body) {
        JsonNode tweet = read(body).path("tweet");
        if (tweet.isMissingNode()) {
            return List.of();
        }
        JsonNode photos = tweet.path("media").path("photos");
        String image = photos.isArray() && !photos.isEmpty() ? photos.get(0).path("url").asText(null) : null;
        Instant at = tweet.hasNonNull("created_timestamp") ? Instant.ofEpochSecond(tweet.path("created_timestamp").asLong()) : null;
        String name = tweet.path("author").path("name").asText("");
        return List.of(new Entry(null,
                clean(tweet.path("text").asText(""), MAX_TEXT),
                safeUrl(tweet.path("url").asText(null)),
                safeUrl(image),
                clean(name.isBlank() ? "@" + tweet.path("author").path("screen_name").asText("") : name, 80),
                at));
    }

    /** The RSS/Atom feed a web page announces in its head, if any. */
    public static java.util.Optional<java.net.URI> discoverFeed(byte[] html, java.net.URI page) {
        String head = new String(html, 0, Math.min(html.length, 200_000), java.nio.charset.StandardCharsets.UTF_8);
        Matcher link = FEED_LINK.matcher(head);
        while (link.find()) {
            Matcher href = HREF.matcher(link.group());
            if (href.find()) {
                try {
                    String url = safeUrl(page.resolve(href.group(1).replace("&amp;", "&").strip()).toString());
                    if (url != null) {
                        return java.util.Optional.of(java.net.URI.create(url));
                    }
                } catch (IllegalArgumentException ignored) {
                    // a broken href: try the next one
                }
            }
        }
        return java.util.Optional.empty();
    }

    // — helpers —

    private static Document xml(byte[] body) {
        try {
            DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
            f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            f.setFeature("http://xml.org/sax/features/external-general-entities", false);
            f.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            f.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            f.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            f.setXIncludeAware(false);
            f.setExpandEntityReferences(false);
            DocumentBuilder b = f.newDocumentBuilder();
            b.setErrorHandler(null);
            return b.parse(new ByteArrayInputStream(body));
        } catch (Exception e) {
            throw new IllegalArgumentException("Not a readable feed", e);
        }
    }

    private static JsonNode read(byte[] body) {
        try {
            return JSON.readTree(body);
        } catch (Exception e) {
            throw new IllegalArgumentException("Not readable JSON", e);
        }
    }

    private static String firstText(Element parent, String... names) {
        for (String name : names) {
            Element el = firstElement(parent, name);
            if (el != null && !el.getTextContent().isBlank()) {
                return el.getTextContent().strip();
            }
        }
        return null;
    }

    /** First direct child with this (prefixed) tag name. */
    private static Element firstElement(Element parent, String name) {
        for (Node n = parent.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (n instanceof Element el && el.getTagName().equals(name)) {
                return el;
            }
        }
        return null;
    }

    private static String atomLink(Element entry) {
        String any = null;
        for (Node n = entry.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (n instanceof Element el && el.getTagName().equals("link")) {
                String rel = el.getAttribute("rel");
                if (rel.isEmpty() || rel.equals("alternate")) {
                    return el.getAttribute("href");
                }
                any = any == null ? el.getAttribute("href") : any;
            }
        }
        return any;
    }

    /** The article's picture: enclosure, media tags, or the first image in its HTML. */
    private static String image(Element item, String html) {
        for (String tag : List.of("media:content", "media:thumbnail", "enclosure")) {
            Element el = firstElement(item, tag);
            if (el != null) {
                String type = el.getAttribute("type");
                String url = el.getAttribute("url");
                if (!url.isEmpty() && (type.isEmpty() || type.startsWith("image/"))) {
                    return url;
                }
            }
        }
        Element group = firstElement(item, "media:group");
        if (group != null) {
            Element thumb = firstElement(group, "media:thumbnail");
            if (thumb != null && !thumb.getAttribute("url").isEmpty()) {
                return thumb.getAttribute("url");
            }
        }
        if (html != null) {
            Matcher m = IMG.matcher(html);
            if (m.find()) {
                return m.group(1).replace("&amp;", "&");
            }
        }
        return null;
    }

    /** Plain text: tags dropped, common entities decoded, spaces folded, cut at max. */
    static String clean(String raw, int max) {
        if (raw == null) {
            return null;
        }
        String text = TAG.matcher(raw).replaceAll(" ")
                .replace("&nbsp;", " ").replace("&#160;", " ").replace("&amp;", "&").replace("&quot;", "\"")
                .replace("&#039;", "'").replace("&#39;", "'").replace("&rsquo;", "’").replace("&#8217;", "’")
                .replace("&hellip;", "…").replace("&#8230;", "…").replace("&laquo;", "«").replace("&raquo;", "»")
                .replace("&lt;", "<").replace("&gt;", ">");
        text = SPACES.matcher(text).replaceAll(" ").strip();
        if (text.isEmpty()) {
            return null;
        }
        return text.length() <= max ? text : text.substring(0, max - 1).stripTrailing() + "…";
    }

    /** Only http(s) addresses, else nothing (no javascript:, data:…). */
    static String safeUrl(String raw) {
        if (raw == null) {
            return null;
        }
        String url = raw.strip();
        String lower = url.toLowerCase(Locale.ROOT);
        return (lower.startsWith("https://") || lower.startsWith("http://")) && url.length() <= 2048 ? url : null;
    }

    static Instant date(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String s = raw.strip();
        try {
            // RSS dates; the weekday is dropped, some feeds get it wrong.
            return ZonedDateTime.parse(s.replaceFirst("^[A-Za-z]{3},\\s*", ""), DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
        } catch (Exception ignored) {
            // not RFC 1123 (RSS); try ISO 8601 (Atom, Bluesky)
        }
        try {
            return OffsetDateTime.parse(s).toInstant();
        } catch (Exception ignored) {
            return null;
        }
    }
}
