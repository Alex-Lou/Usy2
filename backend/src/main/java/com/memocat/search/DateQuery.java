package com.memocat.search;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.TextStyle;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A search that is a date, read in the couple's time zone, as a [from, to) range:
 * "12/03/2025" (that day), "12/03" (the last 12 March up to today),
 * "03/2025" or "mars 2025" (that month). Anything else is not a date.
 */
record DateQuery(ZonedDateTime from, ZonedDateTime to) {

    private static final Pattern DAY = Pattern.compile("(\\d{1,2})[/.-](\\d{1,2})(?:[/.-](\\d{2}|\\d{4}))?");
    private static final Pattern MONTH_NUM = Pattern.compile("(\\d{1,2})[/.-](\\d{4})");
    private static final Pattern MONTH_NAME = Pattern.compile("(\\p{L}+)\\s+(\\d{4})");

    static Optional<DateQuery> parse(String q, LocalDate today, ZoneId zone) {
        String s = q.trim().toLowerCase(Locale.FRENCH);
        try {
            Matcher m = MONTH_NUM.matcher(s);
            if (m.matches()) {
                return month(LocalDate.of(Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)), 1), zone);
            }
            m = DAY.matcher(s);
            if (m.matches()) {
                int day = Integer.parseInt(m.group(1));
                int month = Integer.parseInt(m.group(2));
                LocalDate date;
                if (m.group(3) != null) {
                    int year = Integer.parseInt(m.group(3));
                    date = LocalDate.of(year < 100 ? 2000 + year : year, month, day);
                } else {
                    date = LocalDate.of(today.getYear(), month, day);
                    if (date.isAfter(today)) date = date.minusYears(1);
                }
                return Optional.of(new DateQuery(date.atStartOfDay(zone), date.plusDays(1).atStartOfDay(zone)));
            }
            m = MONTH_NAME.matcher(s);
            if (m.matches()) {
                for (int i = 1; i <= 12; i++) {
                    String name = java.time.Month.of(i).getDisplayName(TextStyle.FULL, Locale.FRENCH);
                    if (strip(name).equals(strip(m.group(1)))) {
                        return month(LocalDate.of(Integer.parseInt(m.group(2)), i, 1), zone);
                    }
                }
            }
        } catch (java.time.DateTimeException e) {
            return Optional.empty(); // 31/02 and the like
        }
        return Optional.empty();
    }

    private static Optional<DateQuery> month(LocalDate first, ZoneId zone) {
        return Optional.of(new DateQuery(first.atStartOfDay(zone), first.plusMonths(1).atStartOfDay(zone)));
    }

    /** "février" and "fevrier" are the same month. */
    private static String strip(String s) {
        return java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
}
