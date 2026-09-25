package com.memocat.feed;

import java.util.List;
import java.util.Set;

/** Curated, closed set of reaction emojis (validated server-side). */
public final class ReactionEmojis {

    public static final List<String> ALLOWED_ORDER = List.of("❤️", "😍", "😂", "😮", "😢", "👍", "🔥");
    public static final Set<String> ALLOWED = Set.copyOf(ALLOWED_ORDER);

    private ReactionEmojis() {
    }
}
