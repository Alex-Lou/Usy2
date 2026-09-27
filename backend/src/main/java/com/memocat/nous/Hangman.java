package com.memocat.nous;

import java.text.Normalizer;
import java.util.Locale;

/**
 * 🪢 The hangman of 💞 Nous deux: the other one's word, found letter by letter.
 * Accents and case don't count (« Crêpe » is played as CREPE); spaces, hyphens
 * and apostrophes are shown from the start.
 */
public final class Hangman {

    public static final int MAX_ERRORS = 7;
    static final int MAX_LETTERS = 20;
    static final int MAX_LENGTH = 24;

    private Hangman() {
    }

    /** Upper case, without accents (œ and æ as two letters), spaces tidied. */
    public static String fold(String s) {
        String t = s.strip().replaceAll("\\s+", " ").replace("œ", "oe").replace("Œ", "OE").replace("æ", "ae").replace("Æ", "AE")
                .replace('’', '\'');
        return Normalizer.normalize(t, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toUpperCase(Locale.ROOT);
    }

    /** A word (or two) that can be played: letters, spaces, hyphens and apostrophes, 2 to 20 letters. */
    public static boolean playable(String word) {
        if (word == null || word.strip().length() > MAX_LENGTH) {
            return false;
        }
        String f = fold(word);
        long letters = f.chars().filter(c -> c >= 'A' && c <= 'Z').count();
        return f.matches("[A-Z][A-Z '\\-]*[A-Z]") && letters >= 2 && letters <= MAX_LETTERS;
    }

    /** One letter typed, as it is played (A to Z), or 0 when it isn't one. */
    public static char letter(String typed) {
        if (typed == null) {
            return 0;
        }
        String f = fold(typed);
        return f.length() == 1 && f.charAt(0) >= 'A' && f.charAt(0) <= 'Z' ? f.charAt(0) : 0;
    }

    /** The word as seen so far: found letters, {@code _} for the others. */
    public static String pattern(String word, String tried) {
        StringBuilder out = new StringBuilder();
        for (char c : fold(word).toCharArray()) {
            out.append(c >= 'A' && c <= 'Z' && tried.indexOf(c) < 0 ? '_' : c);
        }
        return out.toString();
    }

    /** Letters tried that aren't in the word. */
    public static int errors(String word, String tried) {
        String f = fold(word);
        return (int) tried.chars().filter(c -> f.indexOf(c) < 0).count();
    }

    public static boolean found(String word, String tried) {
        return pattern(word, tried).indexOf('_') < 0;
    }
}
