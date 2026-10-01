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
    /** "Je pense à toi": a gentle nudge to the other person. */
    public static final String THINKING = "thinking";
    /** The shared side-menu widgets changed: sync only, no notification. */
    public static final String WIDGETS = "widgets";
    /** A date on the shared calendar was added, changed or removed: sync only. */
    public static final String EVENTS = "events";
    /** The shared look of the app changed: sync only. */
    public static final String APPEARANCE = "appearance";
    /** A quiz "défi" was sent (detail: what it is about, refId: the duel). */
    public static final String QUIZ_CHALLENGE = "quiz-challenge";
    /** A quiz "défi" was played back: the duel is over. */
    public static final String QUIZ_DONE = "quiz-done";
    /** 💞 Nous deux: a guess in words about the other one (refId: the guess). */
    public static final String NOUS_GUESS = "nous-guess";
    /** 💞 Nous deux: one of us proposes to start again for both (detail: the theme, or null for everything). */
    public static final String NOUS_RESET_ASK = "nous-reset-ask";
    /** 💞 Nous deux: answers started again (detail: mine / accepted), or a proposal dropped (cancelled / refused). */
    public static final String NOUS_RESET = "nous-reset";

    /** 🐾 The other one found my hidden note (detail: where the photo is, refId: the note). */
    public static final String HIDDEN_FOUND = "hidden-found";
    /** 📸 My photo for this week's challenge is posted, theirs not yet (detail: the theme). */
    public static final String CHALLENGE_POSTED = "challenge-posted";
    /** 📸 Both photos of this week's challenge are there (detail: the theme). */
    public static final String CHALLENGE_BOTH = "challenge-both";

    /** ✏️ A shared "mots fléchés" grid was started (detail: its size, refId: the game). */
    public static final String CROSSWORD = "crossword";
    /** ✏️ A shared "mots fléchés" grid is complete (detail: its size, refId: the game). */
    public static final String CROSSWORD_DONE = "crossword-done";

    public static CoupleActivity of(String kind, User actor, String detail, Long refId) {
        return new CoupleActivity(kind, actor.getId(), actor.getDisplayName(), detail, refId);
    }
}
