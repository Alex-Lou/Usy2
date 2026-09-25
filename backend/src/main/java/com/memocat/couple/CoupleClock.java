package com.memocat.couple;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * "Today" for the couple, in their time zone (memocat.timezone), so memories
 * and dates flip at their midnight rather than the server's (UTC).
 */
@Component
public class CoupleClock {

    private final ZoneId zone;
    private final Clock clock;

    @Autowired
    public CoupleClock(@Value("${memocat.timezone:Atlantic/Canary}") String zone) {
        this(ZoneId.of(zone), Clock.systemUTC());
    }

    CoupleClock(ZoneId zone, Clock clock) {
        this.zone = zone;
        this.clock = clock;
    }

    public ZoneId zone() {
        return zone;
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(zone));
    }

    /** The couple's current date and time. */
    public ZonedDateTime now() {
        return ZonedDateTime.now(clock.withZone(zone));
    }
}
