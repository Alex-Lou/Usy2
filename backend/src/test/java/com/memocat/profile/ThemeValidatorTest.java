package com.memocat.profile;

import com.memocat.profile.dto.ThemeDto;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ThemeValidatorTest {

    private final ThemeValidator validator = new ThemeValidator();

    private Map<String, String> validColors() {
        Map<String, String> colors = new HashMap<>();
        colors.put("bg", "#f4f1ea");
        colors.put("surface", "#ffffff");
        colors.put("primary", "#b5476b");
        colors.put("text", "#2b2a28");
        return colors;
    }

    @Test
    void acceptsValidTheme() {
        ThemeDto theme = new ThemeDto(validColors(), "trebuchet", "classic", "custom");
        assertThatCode(() -> validator.validate(theme)).doesNotThrowAnyException();
    }

    @Test
    void acceptsNullMode() {
        ThemeDto theme = new ThemeDto(validColors(), "trebuchet", "classic", null);
        assertThatCode(() -> validator.validate(theme)).doesNotThrowAnyException();
    }

    @Test
    void rejectsUnknownMode() {
        ThemeDto theme = new ThemeDto(validColors(), "trebuchet", "classic", "rainbow");
        assertThatThrownBy(() -> validator.validate(theme))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsNullTheme() {
        assertThatThrownBy(() -> validator.validate(null))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsNonHexColor() {
        Map<String, String> colors = validColors();
        colors.put("primary", "red");
        ThemeDto theme = new ThemeDto(colors, "trebuchet", "classic", "custom");
        assertThatThrownBy(() -> validator.validate(theme))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsCssInjectionAttemptInColor() {
        Map<String, String> colors = validColors();
        colors.put("bg", "#fff; background:url(http://evil/x)");
        ThemeDto theme = new ThemeDto(colors, "trebuchet", "classic", "custom");
        assertThatThrownBy(() -> validator.validate(theme))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsUnknownColorKey() {
        Map<String, String> colors = validColors();
        colors.put("evil", "#000000");
        ThemeDto theme = new ThemeDto(colors, "trebuchet", "classic", "app");
        assertThatThrownBy(() -> validator.validate(theme))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsMissingColorKey() {
        Map<String, String> colors = validColors();
        colors.remove("text");
        ThemeDto theme = new ThemeDto(colors, "trebuchet", "classic", "app");
        assertThatThrownBy(() -> validator.validate(theme))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsUnknownFont() {
        ThemeDto theme = new ThemeDto(validColors(), "papyrus", "classic", "app");
        assertThatThrownBy(() -> validator.validate(theme))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsUnknownLayout() {
        ThemeDto theme = new ThemeDto(validColors(), "trebuchet", "free", "app");
        assertThatThrownBy(() -> validator.validate(theme))
                .isInstanceOf(ContentValidationException.class);
    }
}
