package com.memocat.chat;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MessageEmojiTest {

    @Test
    void anyOneEmojiIsAccepted() {
        for (String e : new String[] {"❤️", "😂", "👍", "🥹", "🫶", "🐈‍⬛", "❤️‍🔥", "👨‍👩‍👧‍👦", "🇫🇷", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "ℹ️", "#️⃣", "1️⃣", "☕"}) {
            assertThat(MessageEmoji.isValid(e)).as(e).isTrue();
        }
    }

    @Test
    void textOrSeveralEmojisAreRefused() {
        for (String e : new String[] {"", " ", "a", "é", "1", "#", "<b>", "ok", "😂😂", "😂 ", "\n", "\u0000"}) {
            assertThat(MessageEmoji.isValid(e)).as(e).isFalse();
        }
        assertThat(MessageEmoji.isValid(null)).isFalse();
    }
}
