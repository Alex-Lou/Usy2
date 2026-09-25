package com.memocat.couple;

import com.memocat.web.ContentValidationException;

/** Shared text rules for the "Nous" space: trimmed, non-empty, bounded. */
final class Texts {

    private Texts() {
    }

    static String required(String value, int max, String what) {
        String text = value == null ? "" : value.strip();
        if (text.isEmpty()) {
            throw new ContentValidationException(what + " est vide");
        }
        if (text.length() > max) {
            throw new ContentValidationException(what + " est trop long (max " + max + ")");
        }
        return text;
    }

    static String optional(String value, int max, String what) {
        String text = value == null ? "" : value.strip();
        return text.isEmpty() ? null : required(text, max, what);
    }
}
