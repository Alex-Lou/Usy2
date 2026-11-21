package com.memocat.chat;

import java.util.regex.Pattern;

/**
 * What a chat message may be reacted with: any one emoji (the app's full
 * picker), never text. Posts and comments keep their short list (ReactionEmojis).
 */
final class MessageEmoji {

    /** The column holds 16 characters: enough for the longest emoji sequences (flags, families). */
    static final int MAX_CODE_POINTS = 16;

    private static final Pattern ONE_GRAPHEME = Pattern.compile("\\X");
    private static final int VARIATION_EMOJI = 0xFE0F;
    private static final int KEYCAP = 0x20E3;

    private MessageEmoji() {
    }

    static boolean isValid(String emoji) {
        if (emoji == null || emoji.isEmpty() || emoji.codePointCount(0, emoji.length()) > MAX_CODE_POINTS) {
            return false;
        }
        if (!ONE_GRAPHEME.matcher(emoji).matches()) {
            return false; // several characters: text, not an emoji
        }
        if (emoji.codePoints().anyMatch(cp -> Character.isWhitespace(cp) || Character.isISOControl(cp))) {
            return false;
        }
        int first = emoji.codePointAt(0);
        boolean plain = first < 0x80 || Character.isLetterOrDigit(first);
        // A letter, digit or ASCII sign only counts in its emoji form (ℹ️, #️⃣, 1️⃣).
        return !plain || emoji.codePoints().anyMatch(cp -> cp == VARIATION_EMOJI || cp == KEYCAP);
    }
}
