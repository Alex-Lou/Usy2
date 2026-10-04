package com.memocat.petitbac;

import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * The rules of the Petit Bac, apart from storage: the letters drawn, what an answer is, when two
 * answers are "the same word", and the points (10 for a good answer of one's own, 5 when both wrote
 * the same, 0 when empty, not on the letter, or refused by the other).
 */
public final class PetitBacRules {

    /** The 20 playable letters: no K, Q, W, X, Y, Z. */
    static final String LETTERS = "ABCDEFGHIJLMNOPRSTUV";

    static final int MIN_CATEGORIES = 3;
    static final int MAX_CATEGORIES = 12;
    static final int MAX_CATEGORY_LENGTH = 40;
    static final int MAX_ANSWER_LENGTH = 40;

    static final int POINTS_ALONE = 10;
    static final int POINTS_SAME = 5;

    /** Direct: once someone cried « Stop ! », the other has this long. */
    static final Duration AFTER_STOP = Duration.ofSeconds(10);
    /** Direct: a round never lasts longer than this, « Stop ! » or not. */
    static final Duration DIRECT_MAX = Duration.ofMinutes(5);
    /** At one's own pace: the clock of each player. */
    static final Duration OWN_PACE = Duration.ofMinutes(3);
    /** Answers still accepted this long after the end (they were typed in time, the network was slow). */
    static final Duration NETWORK_GRACE = Duration.ofSeconds(3);

    /** Words that don't count for the letter: « La Rochelle » is for R, « L'Inde » for I. */
    private static final Pattern ARTICLE = Pattern.compile("^(l'|le |la |les |un |une |des |d')");

    private PetitBacRules() {
    }

    /** A letter not drawn yet in this game (all of them again once each was played). */
    static String draw(Set<String> used, Random random) {
        List<String> left = new ArrayList<>();
        for (char c : LETTERS.toCharArray()) if (!used.contains(String.valueOf(c))) left.add(String.valueOf(c));
        if (left.isEmpty()) for (char c : LETTERS.toCharArray()) left.add(String.valueOf(c));
        return left.get(random.nextInt(left.size()));
    }

    /** An answer as kept: trimmed, single spaces, not too long. */
    static String clean(String raw) {
        if (raw == null) return "";
        String s = raw.strip().replaceAll("\\s+", " ");
        return s.length() > MAX_ANSWER_LENGTH ? s.substring(0, MAX_ANSWER_LENGTH).strip() : s;
    }

    /** The word itself, to compare: no case, accents, article, signs, nor final s/x (« Pommes » = « pomme »). */
    static String key(String answer) {
        String s = Normalizer.normalize(clean(answer).toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('’', '\'');
        s = ARTICLE.matcher(s).replaceFirst("");
        s = s.replaceAll("[^a-z]", "");
        if (s.length() > 3 && (s.endsWith("s") || s.endsWith("x"))) s = s.substring(0, s.length() - 1);
        return s;
    }

    /** Filled in, and on the round's letter. */
    static boolean onLetter(String answer, String letter) {
        String k = key(answer);
        return !k.isEmpty() && k.charAt(0) == Character.toLowerCase(letter.charAt(0));
    }

    /**
     * Points per category for a sheet: {@code refusedByOther} holds the numbers of its answers the
     * other player refused, {@code otherRefused} those of the other's answers refused in return.
     */
    static List<Integer> points(List<String> mine, List<String> theirs, Set<Integer> refusedByOther,
                                Set<Integer> otherRefused, String letter) {
        List<Integer> out = new ArrayList<>(mine.size());
        for (int i = 0; i < mine.size(); i++) {
            boolean good = onLetter(mine.get(i), letter) && !refusedByOther.contains(i);
            String other = i < theirs.size() ? theirs.get(i) : "";
            boolean otherGood = onLetter(other, letter) && !otherRefused.contains(i);
            if (!good) out.add(0);
            else if (otherGood && key(other).equals(key(mine.get(i)))) out.add(POINTS_SAME);
            else out.add(POINTS_ALONE);
        }
        return out;
    }

    /** The categories of a new game, checked: 3 to 12, each 2 to 40 characters, no two alike. */
    static List<String> categories(List<String> raw) {
        if (raw == null) throw new IllegalArgumentException("Choisis des catégories");
        List<String> out = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String r : raw) {
            String c = r == null ? "" : r.strip().replaceAll("\\s+", " ");
            if (c.length() < 2 || c.length() > MAX_CATEGORY_LENGTH) {
                throw new IllegalArgumentException("Une catégorie fait de 2 à " + MAX_CATEGORY_LENGTH + " caractères");
            }
            if (!seen.add(Normalizer.normalize(c.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", ""))) {
                throw new IllegalArgumentException("« " + c + " » est en double");
            }
            out.add(c);
        }
        if (out.size() < MIN_CATEGORIES || out.size() > MAX_CATEGORIES) {
            throw new IllegalArgumentException("De " + MIN_CATEGORIES + " à " + MAX_CATEGORIES + " catégories");
        }
        return out;
    }
}
