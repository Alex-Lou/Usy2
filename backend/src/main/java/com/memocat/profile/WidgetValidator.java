package com.memocat.profile;

import com.memocat.profile.dto.WidgetDto;
import com.memocat.web.ContentValidationException;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Validates the curated widget list. Text is stored as plain text and escaped
 * on display (never injected as HTML). Only the closed set of widget types is
 * accepted.
 */
@Component
public class WidgetValidator {

    static final int MAX_WIDGETS = 20;
    static final int MAX_TEXT = 280;
    static final int MAX_LABEL = 40;
    static final int MAX_EMOJI = 8;

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
        switch (widget.type()) {
            case "marquee", "quote" -> requireText(widget);
            case "mood" -> validateMood(widget);
            default -> throw new ContentValidationException("Unknown widget type: " + widget.type());
        }
    }

    private void requireText(WidgetDto widget) {
        String text = widget.text();
        if (text == null || text.isBlank()) {
            throw new ContentValidationException(widget.type() + " requires non-empty text");
        }
        if (text.length() > MAX_TEXT) {
            throw new ContentValidationException(widget.type() + " text too long (max " + MAX_TEXT + ")");
        }
    }

    private void validateMood(WidgetDto widget) {
        String emoji = widget.emoji();
        if (emoji == null || emoji.isBlank()) {
            throw new ContentValidationException("mood requires an emoji");
        }
        if (emoji.length() > MAX_EMOJI) {
            throw new ContentValidationException("mood emoji too long");
        }
        if (widget.label() != null && widget.label().length() > MAX_LABEL) {
            throw new ContentValidationException("mood label too long (max " + MAX_LABEL + ")");
        }
    }
}
