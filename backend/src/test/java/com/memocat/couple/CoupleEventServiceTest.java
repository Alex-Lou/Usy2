package com.memocat.couple;

import com.memocat.couple.dto.CoupleEventDto;
import com.memocat.couple.dto.CoupleRequests.EventRequest;
import com.memocat.domain.CoupleEvent;
import com.memocat.domain.User;
import com.memocat.repository.CoupleEventRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoupleEventServiceTest {

    private static final ZoneId ZONE = ZoneId.of("Atlantic/Canary");

    @Mock private CoupleEventRepository events;
    @Mock private UserRepository users;
    @Mock private ApplicationEventPublisher publisher;

    private final User lou = new User("lou", "hash", "Lou");

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(lou, "id", 1L);
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(events.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    /** The service with the couple's clock at {@code localTime} (their zone). */
    private CoupleEventService at(String localTime) {
        Instant instant = java.time.LocalDateTime.parse(localTime).atZone(ZONE).toInstant();
        return new CoupleEventService(events, users, new CoupleClock(ZONE, Clock.fixed(instant, ZONE)), publisher);
    }

    private static CoupleEvent event(long id, String title, LocalDate day, boolean yearly) {
        CoupleEvent e = new CoupleEvent(new User("sam", "hash", "Sam"));
        e.edit(title, day, null, null, null, yearly);
        ReflectionTestUtils.setField(e, "id", id);
        return e;
    }

    @Test
    void createTrimsAndSyncsWithoutText() {
        CoupleEventDto dto = at("2026-09-24T10:00").create("lou",
                new EventRequest("  Resto  ", LocalDate.of(2026, 10, 3), LocalTime.of(20, 30, 15), " 🍝 ", "  ", false));

        assertThat(dto.title()).isEqualTo("Resto");
        assertThat(dto.emoji()).isEqualTo("🍝");
        assertThat(dto.note()).isNull();
        assertThat(dto.time()).isEqualTo(LocalTime.of(20, 30));
        ArgumentCaptor<CoupleActivity> activity = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(publisher).publishEvent(activity.capture());
        assertThat(activity.getValue().kind()).isEqualTo(CoupleActivity.EVENTS);
        assertThat(activity.getValue().detail()).isNull();
    }

    @Test
    void invalidEventsAreNeverSaved() {
        CoupleEventService service = at("2026-09-24T10:00");
        assertThatThrownBy(() -> service.create("lou", new EventRequest("Resto", null, null, null, null, false)))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.create("lou", new EventRequest("  ", LocalDate.of(2026, 1, 1), null, null, null, false)))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.create("lou", new EventRequest("x".repeat(61), LocalDate.of(2026, 1, 1), null, null, null, false)))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.create("lou", new EventRequest("Resto", LocalDate.of(2026, 1, 1), null, null, "x".repeat(301), false)))
                .isInstanceOf(ContentValidationException.class);
        when(events.count()).thenReturn((long) CoupleEventService.MAX_EVENTS);
        assertThatThrownBy(() -> service.create("lou", new EventRequest("Resto", LocalDate.of(2026, 1, 1), null, null, null, false)))
                .isInstanceOf(ContentValidationException.class);
        verify(events, never()).save(any());
        verifyNoInteractions(publisher);
    }

    @Test
    void yearlyEventsComeBackEveryYearFromTheirFirstDate() {
        CoupleEvent birthday = event(1, "Anniv", LocalDate.of(2024, 2, 29), true);
        assertThat(birthday.occursOn(LocalDate.of(2025, 2, 28))).isTrue(); // no 29th that year
        assertThat(birthday.occursOn(LocalDate.of(2028, 2, 29))).isTrue();
        assertThat(birthday.occursOn(LocalDate.of(2028, 2, 28))).isFalse();
        assertThat(birthday.occursOn(LocalDate.of(2023, 2, 28))).isFalse(); // before it started

        CoupleEvent once = event(2, "Resto", LocalDate.of(2026, 10, 3), false);
        assertThat(once.occursOn(LocalDate.of(2026, 10, 3))).isTrue();
        assertThat(once.occursOn(LocalDate.of(2027, 10, 3))).isFalse();
    }

    @Test
    void noReminderBeforeTheEvening() {
        assertThat(at("2026-10-02T18:59").remindTomorrow()).isZero();
        verifyNoInteractions(events, publisher);
    }

    @Test
    void eveningBeforeRemindsTomorrowsEventsOnce() {
        LocalDate tomorrow = LocalDate.of(2026, 10, 3);
        CoupleEvent resto = event(1, "Resto", tomorrow, false);
        CoupleEvent anniv = event(2, "Anniv", LocalDate.of(2020, 10, 3), true);
        CoupleEvent other = event(3, "Ciné", LocalDate.of(2020, 5, 1), true);
        CoupleEvent alreadySent = event(4, "Dentiste", tomorrow, false);
        when(events.findCandidatesFor(tomorrow)).thenReturn(List.of(resto, anniv, other, alreadySent));
        when(events.markReminded(1L, tomorrow)).thenReturn(1);
        when(events.markReminded(2L, tomorrow)).thenReturn(1);
        when(events.markReminded(4L, tomorrow)).thenReturn(0);

        assertThat(at("2026-10-02T19:05").remindTomorrow()).isEqualTo(2);

        verify(events, never()).markReminded(eq(3L), any());
        ArgumentCaptor<EventReminder> sent = ArgumentCaptor.forClass(EventReminder.class);
        verify(publisher, org.mockito.Mockito.times(2)).publishEvent(sent.capture());
        assertThat(sent.getAllValues()).extracting(EventReminder::eventId).containsExactly(1L, 2L);
    }
}
