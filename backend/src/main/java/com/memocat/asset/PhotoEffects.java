package com.memocat.asset;

import com.memocat.web.ContentValidationException;

import java.util.Set;

/** The closed list of animated effects a photo can carry (played by the app, never code). */
public final class PhotoEffects {

    public static final Set<String> ALL = Set.of("bounce", "zoom", "shake", "rainbow", "hearts", "sparkles", "snow");

    private PhotoEffects() {
    }

    /** @return the effect, or null when none; rejects anything not in the list. */
    public static String validate(String effect) {
        if (effect == null || effect.isBlank()) {
            return null;
        }
        if (!ALL.contains(effect)) {
            throw new ContentValidationException("Effet inconnu");
        }
        return effect;
    }
}
