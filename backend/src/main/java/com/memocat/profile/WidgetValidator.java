package com.memocat.profile;

import com.memocat.profile.dto.WidgetDto;
import com.memocat.web.ContentValidationException;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Validates the curated widget list. Text is stored as plain text and rendered
 * safely on display (escaped, or via a whitelist for richtext) — never injected
 * as raw HTML. Only the closed set of widget types is accepted, so there is no
 * XSS vector even for content the couple types themselves.
 */
@Component
public class WidgetValidator {

    static final int MAX_WIDGETS = 20;
    static final int MAX_TEXT = 280;
    static final int MAX_RICHTEXT = 1000;
    static final int MAX_LABEL = 40;
    static final int MAX_EMOJI = 8;
    static final int MAX_PINS = 12;
    static final int MAX_URL = 2048;
    static final int MAX_CELLS = 4;

    /** Curated animated SVG choices (chibi animals + a few decorative marks). */
    static final Set<String> SVG_VARIANTS = Set.of(
            "heart", "stars", "sparkle",
            // animated scenes (frontend widgets/scenes.tsx)
            "butterflies", "blossom", "heart-bubbles", "moon", "shooting-stars", "aurora",
            "fairy", "fireflies", "mushrooms", "clover", "fern", "leaves", "triquetra",
            "rain", "waves", "standing-stones", "candle", "tea", "snow",
            "cat", "dog", "wolf", "rabbit", "lizard", "raccoon", "capybara", "robin", "parrot", "penguin");

    private static final Pattern DATE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}([T ]\\d{2}:\\d{2}(:\\d{2})?)?$");

    public void validate(List<WidgetDto> widgets) {
        if (widgets == null) {
            throw new ContentValidationException("widgets is required");
        }
        if (widgets.size() > MAX_WIDGETS) {
            throw new ContentValidationException("Too many widgets (max " + MAX_WIDGETS + ")");
        }
        for (WidgetDto widget : widgets) {
            validateOne(widget);
        }
    }

    private void validateOne(WidgetDto widget) {
        if (widget == null || widget.type() == null) {
            throw new ContentValidationException("widget type is required");
        }
        validateCells(widget.w(), "width");
        validateCells(widget.h(), "height");
        StyleValidator.validate(widget.style(), false);
        switch (widget.type()) {
            case "marquee", "quote" -> requireText(widget, MAX_TEXT);
            case "richtext" -> requireText(widget, MAX_RICHTEXT);
            case "mood" -> validateMood(widget);
            case "clock" -> validateLabel(widget);
            case "countdown" -> validateCountdown(widget);
            case "image" -> validateImage(widget);
            case "svg" -> validateSvg(widget);
            case "pins" -> validatePins(widget);
            default -> throw new ContentValidationException("Unknown widget type: " + widget.type());
        }
    }

    /** A size on the profile grid: absent, or 1 to MAX_CELLS cells. */
    private void validateCells(Integer cells, String what) {
        if (cells != null && (cells < 1 || cells > MAX_CELLS)) {
            throw new ContentValidationException("widget " + what + " must be 1 to " + MAX_CELLS + " cells");
        }
    }

    private void requireText(WidgetDto widget, int max) {
        String text = widget.text();
        if (text == null || text.isBlank()) {
            throw new ContentValidationException(widget.type() + " requires non-empty text");
        }
        if (text.length() > max) {
            throw new ContentValidationException(widget.type() + " text too long (max " + max + ")");
        }
    }

    // The mood widget now shows the live mood of the "Nous" space; a stored
    // emoji is only a leftover from before, so it is optional.
    private void validateMood(WidgetDto widget) {
        String emoji = widget.emoji();
        if (emoji != null && emoji.length() > MAX_EMOJI) {
            throw new ContentValidationException("mood emoji too long");
        }
        validateLabel(widget);
    }

    private void validateCountdown(WidgetDto widget) {
        String date = widget.date();
        if (date == null || !DATE.matcher(date).matches()) {
            throw new ContentValidationException("countdown requires a valid date (YYYY-MM-DD)");
        }
        try {
            LocalDate.parse(date.substring(0, 10));
        } catch (DateTimeParseException e) {
            throw new ContentValidationException("countdown date is not a real date");
        }
        validateLabel(widget);
    }

    private void validateImage(WidgetDto widget) {
        if (widget.assetId() == null || widget.assetId() <= 0) {
            throw new ContentValidationException("image requires an assetId");
        }
        validateLabel(widget);
    }

    private void validateSvg(WidgetDto widget) {
        if (widget.variant() == null || !SVG_VARIANTS.contains(widget.variant())) {
            throw new ContentValidationException("Unsupported svg variant: " + widget.variant());
        }
        validateLabel(widget);
    }

    /** Pins open in the browser: only real http(s) addresses (never javascript:, data:…). */
    private void validatePins(WidgetDto widget) {
        List<WidgetDto.PinDto> pins = widget.pins();
        if (pins == null || pins.isEmpty() || pins.size() > MAX_PINS) {
            throw new ContentValidationException("pins requires 1 to " + MAX_PINS + " links");
        }
        for (WidgetDto.PinDto pin : pins) {
            if (pin == null || !isWebAddress(pin.url())) {
                throw new ContentValidationException("Each pin needs an http(s) address");
            }
            if (pin.label() != null && pin.label().length() > MAX_LABEL) {
                throw new ContentValidationException("pin name too long (max " + MAX_LABEL + ")");
            }
        }
        validateLabel(widget);
    }

    static boolean isWebAddress(String url) {
        if (url == null || url.isBlank() || url.length() > MAX_URL) {
            return false;
        }
        try {
            URI uri = new URI(url);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            return (scheme.equals("http") || scheme.equals("https")) && uri.getHost() != null
                    && uri.getRawUserInfo() == null;
        } catch (URISyntaxException e) {
            return false;
        }
    }

    private void validateLabel(WidgetDto widget) {
        if (widget.label() != null && widget.label().length() > MAX_LABEL) {
            throw new ContentValidationException("label too long (max " + MAX_LABEL + ")");
        }
    }
}
