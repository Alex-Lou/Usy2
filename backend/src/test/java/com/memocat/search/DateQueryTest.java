package com.memocat.search;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class DateQueryTest {

    private static final ZoneId ZONE = ZoneId.of("Atlantic/Canary");
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 29);

    private static String range(String q) {
        return DateQuery.parse(q, TODAY, ZONE)
                .map(d -> d.from().toLocalDate() + ".." + d.to().toLocalDate())
                .orElse("-");
    }

    @Test
    void aFullDateIsThatDay() {
        assertThat(range("12/03/2025")).isEqualTo("2025-03-12..2025-03-13");
        assertThat(range("12.03.25")).isEqualTo("2025-03-12..2025-03-13");
    }

    @Test
    void aDayWithoutYearIsTheLastOneUpToToday() {
        assertThat(range("12/03")).isEqualTo("2026-03-12..2026-03-13");
        assertThat(range("25/12")).isEqualTo("2025-12-25..2025-12-26");
    }

    @Test
    void aMonthIsTheWholeMonth() {
        assertThat(range("03/2025")).isEqualTo("2025-03-01..2025-04-01");
        assertThat(range("Février 2026")).isEqualTo("2026-02-01..2026-03-01");
        assertThat(range("fevrier 2026")).isEqualTo("2026-02-01..2026-03-01");
    }

    @Test
    void anythingElseIsText() {
        assertThat(range("resto")).isEqualTo("-");
        assertThat(range("31/02/2025")).isEqualTo("-");
        assertThat(range("bonjour 2026")).isEqualTo("-");
        assertThat(range("2026")).isEqualTo("-");
    }

    @Test
    void likeCharactersAreLiteral() {
        assertThat(SearchService.likePattern("50%_A")).isEqualTo("%50\\%\\_a%");
    }
}
