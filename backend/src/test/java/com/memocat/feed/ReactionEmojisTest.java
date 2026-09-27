package com.memocat.feed;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards against build-time charset regressions: the expected emojis are built
 * from Unicode code points (no emoji literals in THIS file), so if the sources
 * were compiled with a non-UTF-8 charset, {@link ReactionEmojis}' literals would
 * be mangled and this comparison would fail.
 */
class ReactionEmojisTest {

    private static String cp(int... codePoints) {
        StringBuilder sb = new StringBuilder();
        for (int c : codePoints) {
            sb.append(Character.toChars(c));
        }
        return sb.toString();
    }

    @Test
    void reactionEmojisAreNotMangled() {
        List<String> expected = List.of(
                cp(0x2764, 0xFE0F), // ❤️
                cp(0x1F60D),        // 😍
                cp(0x1F602),        // 😂
                cp(0x1F62E),        // 😮
                cp(0x1F622),        // 😢
                cp(0x1F44D),        // 👍
                cp(0x1F525));       // 🔥
        assertThat(ReactionEmojis.ALLOWED_ORDER).containsExactlyElementsOf(expected);
    }
}
