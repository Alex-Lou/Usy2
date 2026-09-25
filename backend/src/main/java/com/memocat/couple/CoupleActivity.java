package com.memocat.couple;

import com.memocat.domain.User;

/**
 * Something changed in the shared "Nous" space. Published by the services,
 * broadcast on /topic/couple after commit (clients re-fetch) and turned into
 * push notifications. Carries a display name and a short public detail (emoji,
 * list name) — never note text.
 */
public record CoupleActivity(String kind, Long actorId, String actorName, String detail, Long refId) {

    public static final String MOOD = "mood";
    public static final String NOTE = "note";
    /** A list was created or an item added: worth telling the other person. */
    public static final String LIST = "list";
    /** Items checked, removed or renamed: sync only, no notification. */
    public static final String LIST_CHANGE = "list-change";
    public static final String TOGETHER = "together";
    /** The shared side-menu widgets changed: sync only, no notification. */
    public static final String WIDGETS = "widgets";
    /** A date on the shared calendar was added, changed or removed: sync only. */
    public static final String EVENTS = "events";
    /** The shared look of the app changed: sync only. */
    public static final String APPEARANCE = "appearance";

    public static CoupleActivity of(String kind, User actor, String detail, Long refId) {
        return new CoupleActivity(kind, actor.getId(), actor.getDisplayName(), detail, refId);
    }
}
