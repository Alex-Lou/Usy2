package com.memocat.asset;

import com.memocat.web.ContentValidationException;

import java.util.Set;

/**
 * Animated effects a studio photo can carry (same list as effects.ts): a fixed
 * list, plus a custom emoji that falls or rises ("fall:🌸", "rise:🍕"). The
 * custom part may only hold emoji (no letters, digits, spaces or markup), so
 * nothing but a pictograph is ever shown from it.
 */
public final class PhotoEffects {

    public static final Set<String> ALL = Set.of(
            "bounce", "zoom", "shake", "rainbow", "hearts", "sparkles", "snow",
            "heartbeat", "confetti", "petals", "bubbles", "rain", "stars", "fireworks");

    /** Custom emoji: at most this many code points (fits the 16-char column with its prefix). */
    static final int MAX_EMOJI_CODE_POINTS = 8;

    private PhotoEffects() {
    }

    /** @return the effect, or null when none; rejects anything not in the list. */
    public static String validate(String effect) {
        if (effect == null || effect.isBlank()) {
            return null;
        }
        if (ALL.contains(effect) || isCustomEmoji(effect)) {
            return effect;
        }
        throw new ContentValidationException("Effet inconnu");
    }

    private static boolean isCustomEmoji(String effect) {
        int colon = effect.indexOf(':');
        if (colon < 0) {
            return false;
        }
        String direction = effect.substring(0, colon);
        String emoji = effect.substring(colon + 1);
        if (!direction.equals("fall") && !direction.equals("rise")) {
            return false;
        }
        int count = emoji.codePointCount(0, emoji.length());
        if (count < 1 || count > MAX_EMOJI_CODE_POINTS) {
            return false;
        }
        boolean pictograph = false;
        for (int cp : emoji.codePoints().toArray()) {
            if (cp < 0xA0 || Character.isLetterOrDigit(cp) || Character.isWhitespace(cp)) {
                return false;
            }
            int type = Character.getType(cp);
            if (type == Character.OTHER_SYMBOL) {
                pictograph = true;
            } else if (type != Character.FORMAT && type != Character.NON_SPACING_MARK
                    && type != Character.ENCLOSING_MARK && type != Character.MODIFIER_SYMBOL) {
                return false; // e.g. punctuation or math symbols
            }
        }
        return pictograph;
    }
}
