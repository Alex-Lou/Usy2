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

    @Test
    void acceptsValidWidgets() {
        List<WidgetDto> widgets = List.of(
                new WidgetDto("marquee", "Bienvenue", null, null),
                new WidgetDto("quote", "Carpe diem", null, null),
                new WidgetDto("mood", null, "😻", "amoureuse"));
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
        List<WidgetDto> widgets = List.of(new WidgetDto("iframe", "x", null, null));
        assertThatThrownBy(() -> validator.validate(widgets))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsEmptyMarqueeText() {
        List<WidgetDto> widgets = List.of(new WidgetDto("marquee", "  ", null, null));
        assertThatThrownBy(() -> validator.validate(widgets))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsTooLongText() {
        String tooLong = "x".repeat(281);
        List<WidgetDto> widgets = List.of(new WidgetDto("quote", tooLong, null, null));
        assertThatThrownBy(() -> validator.validate(widgets))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsMoodWithoutEmoji() {
        List<WidgetDto> widgets = List.of(new WidgetDto("mood", null, null, "label"));
        assertThatThrownBy(() -> validator.validate(widgets))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsTooManyWidgets() {
        List<WidgetDto> widgets = new ArrayList<>();
        IntStream.range(0, 21).forEach(i -> widgets.add(new WidgetDto("quote", "q" + i, null, null)));
        assertThatThrownBy(() -> validator.validate(widgets))
                .isInstanceOf(ContentValidationException.class);
    }
}
