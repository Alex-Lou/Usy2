package com.memocat.journal;

import com.memocat.couple.CoupleClock;
import com.memocat.domain.JournalEntry;
import com.memocat.domain.User;
import com.memocat.repository.JournalEntryRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * « Notre carnet »: one line a day each, no obligation. A line can be written or
 * rewritten for today or yesterday (the couple's day); an empty line erases it.
 */
@Service
public class JournalService {

    static final int MAX_LENGTH = 280;

    private final JournalEntryRepository entries;
    private final UserRepository users;
    private final CoupleClock clock;

    public JournalService(JournalEntryRepository entries, UserRepository users, CoupleClock clock) {
        this.entries = entries;
        this.users = users;
        this.clock = clock;
    }

    public record Page(LocalDate today, List<JournalEntryDto> entries) {
    }

    /** The lines of a month, or of the whole year when {@code month} is null; newest day first. */
    @Transactional(readOnly = true)
    public Page lines(int year, Integer month) {
        if (year < 2000 || year > 2100) throw new ContentValidationException("Année invalide");
        if (month != null && (month < 1 || month > 12)) throw new ContentValidationException("Mois invalide");
        LocalDate from = LocalDate.of(year, month == null ? 1 : month, 1);
        LocalDate to = month == null ? from.plusYears(1).minusDays(1) : from.plusMonths(1).minusDays(1);
        List<JournalEntryDto> found = entries.findByDayBetweenOrderByDayDescIdAsc(from, to).stream()
                .map(JournalEntryDto::from)
                .toList();
        return new Page(clock.today(), found);
    }

    @Transactional(readOnly = true)
    public List<Integer> years() {
        return entries.findYears();
    }

    /** Writes my line of {@code day} (today when null); empty text erases it and returns empty. */
    @Transactional
    public Optional<JournalEntryDto> write(String username, LocalDate day, String text) {
        User me = users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        LocalDate today = clock.today();
        LocalDate target = day == null ? today : day;
        if (target.isAfter(today) || target.isBefore(today.minusDays(1))) {
            throw new ContentValidationException("On écrit la ligne d'aujourd'hui ou d'hier");
        }
        String line = text == null ? "" : text.strip();
        if (line.length() > MAX_LENGTH) {
            throw new ContentValidationException("La ligne est trop longue (max " + MAX_LENGTH + ")");
        }
        Optional<JournalEntry> existing = entries.findByAuthorIdAndDay(me.getId(), target);
        if (line.isEmpty()) {
            existing.ifPresent(entries::delete);
            return Optional.empty();
        }
        JournalEntry entry = existing.orElseGet(() -> new JournalEntry(me, target, line, clock.now().toInstant()));
        entry.rewrite(line, clock.now().toInstant());
        return Optional.of(JournalEntryDto.from(entries.save(entry)));
    }
}
