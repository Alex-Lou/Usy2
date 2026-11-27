package com.memocat.push;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PreviewsTest {

    @Test
    void anExcerptIsOneShortLine() {
        assertThat(Previews.shorten("  Coucou\n\n  ça va ?  ")).isEqualTo("Coucou ça va ?");
        assertThat(Previews.shorten("   ")).isNull();
        assertThat(Previews.shorten(null)).isNull();
        String longText = "a".repeat(150);
        assertThat(Previews.shorten(longText)).hasSize(Previews.MAX).endsWith("…");
        assertThat(Previews.shorten("😀".repeat(150))).endsWith("😀…"); // never cut inside an emoji
    }

    @Test
    void joinedEmojisAreNeverCutApart() {
        String family = "👨‍👩‍👧‍👦"; // one emoji, seven code points
        String cut = Previews.shorten(family.repeat(150));
        assertThat(cut).endsWith(family + "…");
        assertThat(cut.replace("…", "")).isEqualTo(family.repeat(Previews.MAX - 1));
    }

    @Test
    void stickersReadAsWordsNotCode() {
        assertThat(Previews.shorten("[[s:chat-coeur]]")).isEqualTo("✨ Sticker");
        assertThat(Previews.shorten("  [[s:chat-coeur]]  ")).isEqualTo("✨ Sticker");
        assertThat(Previews.shorten("Coucou [[s:chat-coeur]] toi")).isEqualTo("Coucou ✨ toi");
    }

    @Test
    void theQuoteAboveAReplyHasItsOwnLength() {
        assertThat(Previews.shorten("😀".repeat(200), 140)).endsWith("😀…");
        assertThat(Previews.shorten("[[s:chat-coeur]]", 140)).isEqualTo("✨ Sticker");
    }

    @Test
    void anAttachmentAloneSaysWhatItIs() {
        assertThat(Previews.attachment("image/jpeg", "IMG_1.jpg")).isEqualTo("📷 Photo");
        assertThat(Previews.attachment("image/gif", "giphy.gif")).isEqualTo("🎞️ GIF");
        assertThat(Previews.attachment("audio/webm", "vocal.webm")).isEqualTo("🎤 Message vocal");
        assertThat(Previews.attachment("audio/mpeg", "Notre chanson.mp3")).isEqualTo("🎵 Notre chanson.mp3");
        assertThat(Previews.several(java.util.List.of("image/jpeg", "image/png", "image/gif"))).isEqualTo("📷 3 photos");
        assertThat(Previews.several(java.util.List.of("image/jpeg", "application/pdf"))).isEqualTo("📎 2 fichiers");
        assertThat(Previews.attachment("application/pdf", "billet.pdf")).isEqualTo("📎 billet.pdf");
    }
}
