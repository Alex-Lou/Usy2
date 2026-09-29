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
}
