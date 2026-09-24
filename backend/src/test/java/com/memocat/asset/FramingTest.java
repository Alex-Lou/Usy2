package com.memocat.asset;

import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FramingTest {

    @Test
    void validFramingIsRoundedAndSurvivesStorage() {
        Framing f = Framing.validate(new Framing(0.123456, 1, 2.5));
        assertThat(f).isEqualTo(new Framing(0.123, 1, 2.5));
        assertThat(f.format()).isEqualTo("0.123,1.0,2.5");
        assertThat(Framing.parse(f.format())).isEqualTo(f);
        assertThat(new FramingConverter().convertToEntityAttribute(new FramingConverter().convertToDatabaseColumn(f))).isEqualTo(f);
    }

    @Test
    void zoomingOutDownToHalfIsAllowed() {
        assertThat(Framing.validate(new Framing(0, 1, 0.5))).isEqualTo(new Framing(0, 1, 0.5));
        assertThat(Framing.parse("0.5,0.5,0.75")).isEqualTo(new Framing(0.5, 0.5, 0.75));
    }

    @Test
    void outOfRangeIsRefused() {
        assertThatThrownBy(() -> Framing.validate(new Framing(-0.1, 0.5, 1))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> Framing.validate(new Framing(0.5, 1.2, 1))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> Framing.validate(new Framing(0.5, 0.5, 0.4))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> Framing.validate(new Framing(0.5, 0.5, 9))).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> Framing.validate(new Framing(Double.NaN, 0.5, 1))).isInstanceOf(ContentValidationException.class);
        assertThat(Framing.validate(null)).isNull();
    }

    @Test
    void unreadableStoredValueMeansCentred() {
        assertThat(Framing.parse(null)).isNull();
        assertThat(Framing.parse("abc")).isNull();
        assertThat(Framing.parse("0.5,0.5")).isNull();
        assertThat(Framing.parse("2,0.5,1")).isNull();
    }
}
