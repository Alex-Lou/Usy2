package com.memocat.export;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class ExportTokensTest {

    @Test
    void aLinkWorksOnceForItsOwner() {
        ExportTokens tokens = new ExportTokens();
        String token = tokens.issue("lou");

        assertThat(tokens.redeem(token)).contains("lou");
        assertThat(tokens.redeem(token)).isEmpty(); // used up
        assertThat(tokens.redeem("made-up")).isEmpty();
        assertThat(tokens.redeem(null)).isEmpty();
    }

    @Test
    void aLinkExpiresAfterAFewMinutes() {
        MutableClock clock = new MutableClock(Instant.parse("2026-09-29T17:00:00Z"));
        ExportTokens tokens = new ExportTokens(clock);
        String token = tokens.issue("lou");

        clock.now = clock.now.plus(ExportTokens.VALID_FOR).plusSeconds(1);

        assertThat(tokens.redeem(token)).isEmpty();
    }

    @Test
    void fileNamesStayInsideTheirFolder() {
        assertThat(ExportService.safe("../../etc/passwd")).doesNotContain("/").doesNotStartWith(".");
        assertThat(ExportService.safe("photo vacances.jpg")).isEqualTo("photo vacances.jpg");
        assertThat(ExportService.safe("")).isEqualTo("fichier");
    }

    private static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
