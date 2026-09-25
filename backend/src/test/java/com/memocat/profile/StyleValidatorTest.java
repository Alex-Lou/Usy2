package com.memocat.profile;

import com.memocat.profile.dto.PartStyleDto;
import com.memocat.profile.dto.ThemeDto;
import com.memocat.profile.dto.WidgetDto;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StyleValidatorTest {

    private static final Map<String, String> COLORS =
            Map.of("bg", "#f4f1ea", "surface", "#ffffff", "primary", "#b5476b", "text", "#2b2a28");

    private static PartStyleDto full() {
        return new PartStyleDto("#112233", "#445566", 80, "#ffffff", "#ff3d9a", "thick", "#abcdef", "round", "soft",
                true, "caveat", "l", true, "center", null, null);
    }

    private static PartStyleDto colors(String bg, String text) {
        return new PartStyleDto(bg, null, null, text, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    private static PartStyleDto photo(Long assetId, Integer veil) {
        return new PartStyleDto("#000000", null, null, null, null, null, null, null, null, null, null, null, null, null,
                assetId, veil);
    }

    private static ThemeDto theme(Map<String, PartStyleDto> parts) {
        return new ThemeDto(COLORS, "app", "classic", "app", null, "profile", null, parts);
    }

    @Test
    void everyPartAcceptsAFullLook() {
        assertThatCode(() -> new ThemeValidator().validate(theme(Map.of(
                "page", photo(7L, 40), "header", full(), "tabs", full(), "widgets", full())))).doesNotThrowAnyException();
        assertThatCode(() -> new ThemeValidator().validate(theme(null))).doesNotThrowAnyException();
        assertThatCode(() -> StyleValidator.validate(new PartStyleDto(null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null), false)).doesNotThrowAnyException();
    }

    @Test
    void anythingThatIsNotAHexColourIsRefused() {
        for (String bad : List.of("red", "#fff", "url(x)", "#12345g", "rgb(1,2,3)", "#1122334")) {
            assertThatThrownBy(() -> StyleValidator.validate(colors(bad, null), false)).isInstanceOf(ContentValidationException.class);
            assertThatThrownBy(() -> StyleValidator.validate(colors(null, bad), false)).isInstanceOf(ContentValidationException.class);
        }
    }

    @Test
    void choicesOutsideTheListsAreRefused() {
        assertThatThrownBy(() -> new ThemeValidator().validate(theme(Map.of("footer", full()))))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> StyleValidator.validate(new PartStyleDto(null, null, 101, null, null, null, null, null,
                null, null, null, null, null, null, null, null), false)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> StyleValidator.validate(new PartStyleDto(null, null, null, null, null, "dotted", null,
                null, null, null, null, null, null, null, null, null), false)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> StyleValidator.validate(new PartStyleDto(null, null, null, null, null, null, null,
                "blob", null, null, null, null, null, null, null, null), false)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> StyleValidator.validate(new PartStyleDto(null, null, null, null, null, null, null, null,
                "huge", null, null, null, null, null, null, null), false)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> StyleValidator.validate(new PartStyleDto(null, null, null, null, null, null, null, null,
                null, null, "Arial; color:red", null, null, null, null, null), false)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> StyleValidator.validate(new PartStyleDto(null, null, null, null, null, null, null, null,
                null, null, null, "xxl", null, null, null, null), false)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> StyleValidator.validate(new PartStyleDto(null, null, null, null, null, null, null, null,
                null, null, null, null, null, "justify", null, null), false)).isInstanceOf(ContentValidationException.class);
    }

    @Test
    void onlyThePageHasABackgroundPhotoWithABoundedVeil() {
        assertThatThrownBy(() -> new ThemeValidator().validate(theme(Map.of("header", photo(7L, null)))))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> StyleValidator.validate(photo(0L, null), true)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> StyleValidator.validate(photo(7L, 95), true)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> StyleValidator.validate(photo(7L, -1), true)).isInstanceOf(ContentValidationException.class);
    }

    @Test
    void aFrameHasItsOwnLookButNoPhoto() {
        WidgetDto quote = new WidgetDto("quote", "Coucou", null, null, null, null, null, null, null, 2, null, full());
        assertThatCode(() -> new WidgetValidator().validate(List.of(quote))).doesNotThrowAnyException();
        WidgetDto withPhoto = new WidgetDto("quote", "Coucou", null, null, null, null, null, null, null, 2, null, photo(7L, 10));
        assertThatThrownBy(() -> new WidgetValidator().validate(List.of(withPhoto))).isInstanceOf(ContentValidationException.class);
        WidgetDto badColour = new WidgetDto("quote", "Coucou", null, null, null, null, null, null, null, 2, null, colors("blue", null));
        assertThatThrownBy(() -> new WidgetValidator().validate(List.of(badColour))).isInstanceOf(ContentValidationException.class);
    }
}
