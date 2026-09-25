package com.memocat.news;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FeedParserTest {

    private static byte[] b(String s) {
        return s.getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void readsAnRssFeedWithItsPictureAndPlainText() {
        String rss = """
                <?xml version="1.0" encoding="UTF-8"?>
                <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
                <channel><title>Korben</title>
                  <item>
                    <title>FxTwitter &amp; l'API</title>
                    <link>https://korben.info/fxtwitter.html</link>
                    <dc:creator>Korben</dc:creator>
                    <pubDate>Wed, 24 Sep 2026 08:30:00 +0200</pubDate>
                    <description><![CDATA[<p>Lire <b>X</b> sans compte&nbsp;!</p>]]></description>
                    <content:encoded><![CDATA[<img src="https://korben.info/img/fx.jpg"><p>Lire <b>X</b> sans compte&nbsp;!</p>]]></content:encoded>
                  </item>
                  <item>
                    <title>Sans lien sûr</title>
                    <link>javascript:alert(1)</link>
                    <enclosure url="https://cdn.example/pic.png" type="image/png"/>
                  </item>
                </channel></rss>""";
        List<FeedParser.Entry> items = FeedParser.parseFeed(b(rss));

        assertThat(items).hasSize(2);
        FeedParser.Entry first = items.get(0);
        assertThat(first.title()).isEqualTo("FxTwitter & l'API");
        assertThat(first.text()).isEqualTo("Lire X sans compte !");
        assertThat(first.url()).isEqualTo("https://korben.info/fxtwitter.html");
        assertThat(first.image()).isEqualTo("https://korben.info/img/fx.jpg");
        assertThat(first.author()).isEqualTo("Korben");
        assertThat(first.publishedAt()).isEqualTo(Instant.parse("2026-09-24T06:30:00Z"));
        assertThat(items.get(1).url()).isNull(); // javascript: dropped
        assertThat(items.get(1).image()).isEqualTo("https://cdn.example/pic.png");
    }

    @Test
    void readsAnAtomFeedLikeReddit() {
        String atom = """
                <?xml version="1.0" encoding="UTF-8"?>
                <feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
                  <entry>
                    <author><name>/u/geek</name></author>
                    <title>Un Steam Deck maison</title>
                    <link href="https://www.reddit.com/r/pcgaming/comments/abc/"/>
                    <published>2026-09-24T10:00:00+00:00</published>
                    <media:thumbnail url="https://b.thumbs.redditmedia.com/x.jpg"/>
                    <content type="html">&lt;p&gt;Regardez ça&lt;/p&gt;</content>
                  </entry>
                </feed>""";
        FeedParser.Entry e = FeedParser.parseFeed(b(atom)).get(0);

        assertThat(e.title()).isEqualTo("Un Steam Deck maison");
        assertThat(e.url()).isEqualTo("https://www.reddit.com/r/pcgaming/comments/abc/");
        assertThat(e.image()).isEqualTo("https://b.thumbs.redditmedia.com/x.jpg");
        assertThat(e.author()).isEqualTo("/u/geek");
        assertThat(e.text()).isEqualTo("Regardez ça");
        assertThat(e.publishedAt()).isEqualTo(Instant.parse("2026-09-24T10:00:00Z"));
    }

    @Test
    void refusesDoctypesSoNoEntityCanReadFiles() {
        String evil = """
                <?xml version="1.0"?>
                <!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
                <rss><channel><item><title>&xxe;</title><link>https://a.b/</link></item></channel></rss>""";
        assertThatThrownBy(() -> FeedParser.parseFeed(b(evil))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void readsABlueskyAuthorFeedWithoutReposts() {
        String json = """
                {"feed":[
                  {"post":{"uri":"at://did:plc:abc/app.bsky.feed.post/3kxyz","author":{"handle":"korben.info","displayName":"Korben"},
                    "record":{"text":"Nouvel article !","createdAt":"2026-09-24T09:00:00.000Z"},
                    "embed":{"images":[{"thumb":"https://cdn.bsky.app/img/thumb.jpg"}]}}},
                  {"post":{"uri":"at://did:plc:zzz/app.bsky.feed.post/1","author":{"handle":"autre.bsky.social"},"record":{"text":"repost"}},
                   "reason":{"$type":"app.bsky.feed.defs#reasonRepost"}}
                ]}""";
        List<FeedParser.Entry> items = FeedParser.parseBluesky(b(json));

        assertThat(items).hasSize(1);
        assertThat(items.get(0).url()).isEqualTo("https://bsky.app/profile/korben.info/post/3kxyz");
        assertThat(items.get(0).text()).isEqualTo("Nouvel article !");
        assertThat(items.get(0).image()).isEqualTo("https://cdn.bsky.app/img/thumb.jpg");
        assertThat(items.get(0).author()).isEqualTo("Korben");
    }

    @Test
    void readsOnePostFromFxTwitter() {
        String json = """
                {"code":200,"message":"OK","tweet":{"url":"https://x.com/korben/status/123","text":"Hello X",
                 "created_timestamp":1790000000,"author":{"name":"Korben","screen_name":"korben"},
                 "media":{"photos":[{"url":"https://pbs.twimg.com/media/a.jpg"}]}}}""";
        FeedParser.Entry e = FeedParser.parseFxTweet(b(json)).get(0);

        assertThat(e.url()).isEqualTo("https://x.com/korben/status/123");
        assertThat(e.text()).isEqualTo("Hello X");
        assertThat(e.image()).isEqualTo("https://pbs.twimg.com/media/a.jpg");
        assertThat(e.publishedAt()).isEqualTo(Instant.ofEpochSecond(1790000000L));
        assertThat(FeedParser.parseFxTweet(b("{\"code\":404}"))).isEmpty();
    }

    @Test
    void longTextIsCut() {
        assertThat(FeedParser.clean("a".repeat(400), 280)).hasSize(280).endsWith("…");
    }
}
