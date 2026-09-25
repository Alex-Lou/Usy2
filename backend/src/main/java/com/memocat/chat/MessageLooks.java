package com.memocat.chat;

import com.memocat.web.ContentValidationException;

import java.util.Set;

/**
 * How a message can be sent: a bubble style and a full-screen effect, both
 * optional, from closed lists (the database checks the same lists, V24).
 */
public final class MessageLooks {

    public static final Set<String> STYLES = Set.of("shout", "whisper", "shake");
    public static final Set<String> EFFECTS = Set.of("confetti", "hearts", "fireworks", "balloons", "stars", "kisses");

    private MessageLooks() {
    }

    /** Null when absent; the value itself when allowed; refused otherwise. */
    static String style(String value) {
        return check(value, STYLES, "Style de bulle inconnu");
    }

    static String effect(String value) {
        return check(value, EFFECTS, "Effet inconnu");
    }

    private static String check(String value, Set<String> allowed, String error) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        if (!allowed.contains(value)) {
            throw new ContentValidationException(error);
        }
        return value;
    }
}
