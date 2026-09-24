package com.memocat.profile;

import com.memocat.profile.dto.WidgetDto;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WidgetValidatorTest {

    private final WidgetValidator validator = new WidgetValidator();

    // Helpers keep the tests readable now that WidgetDto has more optional fields.
    private WidgetDto text(String type, String text) {
        return new WidgetDto(type, text, null, null, null, null, null);
    }

    private WidgetDto mood(String emoji, String label) {
        return new WidgetDto("mood", null, emoji, label, null, null, null);
    }

    @Test
    void acceptsValidWidgets() {
        List<WidgetDto> widgets = List.of(
                text("marquee", "Bienvenue"),
                text("quote", "Carpe diem"),
                text("richtext", "**Coucou** mon amour"),
                mood("😻", "amoureuse"),
                new WidgetDto("clock", null, null, "Paris", null, null, null),
                new WidgetDto("calendar", null, null, "Nos dates", null, null, null),
                new WidgetDto("countdown", null, null, "Vacances", null, "2026-12-24", null),
                new WidgetDto("image", null, null, "nous", 7L, null, null),
                new WidgetDto("svg", null, null, null, null, null, "heart"));
        assertThatCode(() -> validator.validate(widgets)).doesNotThrowAnyException();
    }

    @Test
    void acceptsEmptyList() {
        assertThatCode(() -> validator.validate(List.of())).doesNotThrowAnyException();
    }

    @Test
    void rejectsNullList() {
        assertThatThrownBy(() -> validator.validate(null))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsUnknownType() {
        assertThatThrownBy(() -> validator.validate(List.of(text("iframe", "x"))))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsEmptyMarqueeText() {
        assertThatThrownBy(() -> validator.validate(List.of(text("marquee", "  "))))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsTooLongText() {
        assertThatThrownBy(() -> validator.validate(List.of(text("quote", "x".repeat(281)))))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void allowsLongerRichtext() {
        assertThatCode(() -> validator.validate(List.of(text("richtext", "x".repeat(900)))))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsTooLongRichtext() {
        assertThatThrownBy(() -> validator.validate(List.of(text("richtext", "x".repeat(1001)))))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void acceptsMoodWithoutEmojiSinceItShowsTheLiveMood() {
        assertThatCode(() -> validator.validate(List.of(mood(null, null)))).doesNotThrowAnyException();
    }

    @Test
    void rejectsOverlongMoodEmoji() {
        assertThatThrownBy(() -> validator.validate(List.of(mood("x".repeat(9), null))))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsCountdownWithoutDate() {
        WidgetDto w = new WidgetDto("countdown", null, null, "x", null, null, null);
        assertThatThrownBy(() -> validator.validate(List.of(w)))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsCountdownWithInvalidDate() {
        WidgetDto w = new WidgetDto("countdown", null, null, "x", null, "2026-13-40", null);
        assertThatThrownBy(() -> validator.validate(List.of(w)))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsImageWithoutAssetId() {
        WidgetDto w = new WidgetDto("image", null, null, null, null, null, null);
        assertThatThrownBy(() -> validator.validate(List.of(w)))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsUnknownSvgVariant() {
        WidgetDto w = new WidgetDto("svg", null, null, null, null, null, "dragon");
        assertThatThrownBy(() -> validator.validate(List.of(w)))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsTooManyWidgets() {
        List<WidgetDto> widgets = new ArrayList<>();
        IntStream.range(0, 21).forEach(i -> widgets.add(text("quote", "q" + i)));
        assertThatThrownBy(() -> validator.validate(widgets))
                .isInstanceOf(ContentValidationException.class);
    }

    private static WidgetDto pins(WidgetDto.PinDto... pins) {
        return new WidgetDto("pins", null, null, "Accès rapides", null, null, null, java.util.List.of(pins));
    }

    @Test
    void pinsAcceptWebAddresses() {
        validator.validate(java.util.List.of(pins(
                new WidgetDto.PinDto("https://www.pinterest.com", "Pinterest"),
                new WidgetDto.PinDto("http://www.duchas.ie/fr", null))));
    }

    @Test
    void pinsRefuseScriptsAndBadAddresses() {
        for (String bad : new String[]{"javascript:alert(1)", "data:text/html,x", "ftp://x.org", "https://", "pas une adresse",
                "https://user:pw@evil.com"}) {
            assertThatThrownBy(() -> validator.validate(java.util.List.of(pins(new WidgetDto.PinDto(bad, "x")))))
                    .as(bad).isInstanceOf(ContentValidationException.class);
        }
    }

    @Test
    void pinsNeedOneToTwelveLinksAndShortNames() {
        assertThatThrownBy(() -> validator.validate(java.util.List.of(pins())))
                .isInstanceOf(ContentValidationException.class);
        WidgetDto.PinDto p = new WidgetDto.PinDto("https://a.fr", null);
        assertThatThrownBy(() -> validator.validate(java.util.List.of(pins(p, p, p, p, p, p, p, p, p, p, p, p, p))))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> validator.validate(java.util.List.of(pins(new WidgetDto.PinDto("https://a.fr", "x".repeat(41))))))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void newScenesAreAcceptedAndAnyWidgetCanBeOnTheHomeFeed() {
        validator.validate(java.util.List.of(
                new WidgetDto("svg", null, null, "Nuit", null, null, "aurora", null, true),
                new WidgetDto("svg", null, null, null, null, null, "triquetra"),
                new WidgetDto("quote", "Sláinte", null, null, null, null, null, null, false)));
        assertThatThrownBy(() -> validator.validate(java.util.List.of(new WidgetDto("svg", null, null, null, null, null, "dragon"))))
                .isInstanceOf(ContentValidationException.class);
    }
}
