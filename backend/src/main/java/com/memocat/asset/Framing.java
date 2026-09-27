package com.memocat.asset;

import com.memocat.web.ContentValidationException;

import java.util.Locale;

/**
 * How an image sits in its frame (avatar circle, cover banner, album tile).
 * The image first fills the frame (like CSS object-fit: cover), then:
 * {@code x}/{@code y} (0–1) choose which part of the overflow shows (0 = left/top,
 * 0.5 = centred, 1 = right/bottom) and {@code zoom} (0.5–4) enlarges it around
 * that point, or shrinks it below 1 (the frame's empty edges are then filled
 * with a blurred copy). The photo itself is never altered, so it can be
 * reframed later.
 */
public record Framing(double x, double y, double zoom) {

    public static final double MIN_ZOOM = 0.5;
    public static final double MAX_ZOOM = 4;

    /** Null stays null (centred); anything out of range is refused. */
    public static Framing validate(Framing f) {
        if (f == null) {
            return null;
        }
        if (!inRange(f.x(), 0, 1) || !inRange(f.y(), 0, 1) || !inRange(f.zoom(), MIN_ZOOM, MAX_ZOOM)) {
            throw new ContentValidationException("Cadrage invalide");
        }
        return new Framing(round(f.x()), round(f.y()), round(f.zoom()));
    }

    /** Stored form, e.g. "0.5,0.25,1.8". */
    public String format() {
        return String.format(Locale.ROOT, "%s,%s,%s", x, y, zoom);
    }

    /** Stored form back to a framing; an unreadable value counts as "centred". */
    public static Framing parse(String stored) {
        if (stored == null || stored.isBlank()) {
            return null;
        }
        String[] parts = stored.split(",");
        if (parts.length != 3) {
            return null;
        }
        try {
            Framing f = new Framing(Double.parseDouble(parts[0]), Double.parseDouble(parts[1]), Double.parseDouble(parts[2]));
            return validate(f);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static boolean inRange(double v, double min, double max) {
        return Double.isFinite(v) && v >= min && v <= max;
    }

    private static double round(double v) {
        return Math.round(v * 1000) / 1000.0;
    }
}
