package com.memocat.feed;

import com.memocat.domain.User;

import java.util.List;
import java.util.Locale;

/**
 * 🏷️ Who a text tags: "@" followed by someone's display name (as the app
 * suggests it), not glued to more letters. The tag lives in the text itself.
 */
final class Mentions {

    private Mentions() {
    }

    /** The ids of the people tagged in {@code text}, the author left out. */
    static List<Long> in(String text, List<User> people, Long authorId) {
        if (text == null || text.indexOf('@') < 0) {
            return List.of();
        }
        String lower = text.toLowerCase(Locale.ROOT);
        return people.stream()
                .filter(u -> !u.getId().equals(authorId))
                .filter(u -> tags(lower, "@" + u.getDisplayName().toLowerCase(Locale.ROOT)))
                .map(User::getId)
                .toList();
    }

    private static boolean tags(String text, String tag) {
        for (int i = text.indexOf(tag); i >= 0; i = text.indexOf(tag, i + 1)) {
            int end = i + tag.length();
            if (end == text.length() || !Character.isLetterOrDigit(text.charAt(end))) {
                return true;
            }
        }
        return false;
    }
}
