package com.memocat.journal;

import com.memocat.couple.CoupleClock;
import com.memocat.domain.JournalEntry;
import com.memocat.domain.User;
import com.memocat.repository.JournalEntryRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JournalServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 29);

    @Mock private JournalEntryRepository entries;
    @Mock private UserRepository users;
    @Mock private CoupleClock clock;

    private JournalService service;
    private User lou;

    @BeforeEach
    void setUp() {
        service = new JournalService(entries, users, clock);
        lou = new User("lou", "hash", "Lou");
        ReflectionTestUtils.setField(lou, "id", 1L);
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(clock.today()).thenReturn(TODAY);
        lenient().when(clock.now()).thenReturn(ZonedDateTime.of(2026, 9, 29, 21, 0, 0, 0, ZoneId.of("UTC")));
        lenient().when(entries.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void writesTodaysLineByDefault() {
        when(entries.findByAuthorIdAndDay(1L, TODAY)).thenReturn(Optional.empty());

        var line = service.write("lou", null, "  Pique-nique au parc  ").orElseThrow();

        assertThat(line.day()).isEqualTo(TODAY);
        assertThat(line.text()).isEqualTo("Pique-nique au parc");
    }

    @Test
    void rewritesTheSameLineInsteadOfAddingOne() {
        JournalEntry existing = new JournalEntry(lou, TODAY.minusDays(1), "Avant", ZonedDateTime.now().toInstant());
        when(entries.findByAuthorIdAndDay(1L, TODAY.minusDays(1))).thenReturn(Optional.of(existing));

        service.write("lou", TODAY.minusDays(1), "Après");

        assertThat(existing.getText()).isEqualTo("Après");
    }

    @Test
    void anEmptyLineErasesIt() {
        JournalEntry existing = new JournalEntry(lou, TODAY, "Oups", ZonedDateTime.now().toInstant());
        when(entries.findByAuthorIdAndDay(1L, TODAY)).thenReturn(Optional.of(existing));

        assertThat(service.write("lou", TODAY, " ")).isEmpty();
        verify(entries).delete(existing);
    }

    @Test
    void onlyTodayOrYesterday() {
        assertThatThrownBy(() -> service.write("lou", TODAY.minusDays(2), "Trop tard"))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.write("lou", TODAY.plusDays(1), "Trop tôt"))
                .isInstanceOf(ContentValidationException.class);
        verify(entries, never()).save(any());
    }

    @Test
    void aLineIsShort() {
        assertThatThrownBy(() -> service.write("lou", null, "x".repeat(281)))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void aMonthOrAWholeYear() {
        service.lines(2026, 2);
        verify(entries).findByDayBetweenOrderByDayDescIdAsc(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28));
        service.lines(2025, null);
        verify(entries).findByDayBetweenOrderByDayDescIdAsc(LocalDate.of(2025, 1, 1), LocalDate.of(2025, 12, 31));
    }
}
