package com.memocat.couple;

import com.memocat.domain.CoupleNote;
import com.memocat.domain.CoupleSettings;
import com.memocat.domain.Mood;
import com.memocat.domain.User;
import com.memocat.repository.CoupleNoteRepository;
import com.memocat.repository.CoupleSettingsRepository;
import com.memocat.repository.MoodRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ForbiddenException;
import com.memocat.web.TooSoonException;
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
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoupleServiceTest {

    @Mock private UserRepository users;
    @Mock private MoodRepository moods;
    @Mock private CoupleNoteRepository notes;
    @Mock private CoupleSettingsRepository settings;
    @Mock private ApplicationEventPublisher events;

    private CoupleService service;
    private final User lou = user(1, "lou", "Lou");
    private final User sam = user(2, "sam", "Sam");

    private static User user(long id, String username, String name) {
        User u = new User(username, "hash", name);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    @BeforeEach
    void setUp() {
        CoupleClock clock = new CoupleClock(ZoneId.of("Atlantic/Canary"),
                Clock.fixed(Instant.parse("2026-09-23T10:00:00Z"), ZoneOffset.UTC));
        service = new CoupleService(users, moods, notes, settings, clock, events);
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
    }

    @Test
    void moodIsTrimmedStoredAndAnnounced() {
        when(moods.findById(1L)).thenReturn(Optional.empty());
        when(moods.saveAndFlush(any(Mood.class))).thenAnswer(inv -> inv.getArgument(0));

        var dto = service.setMood("lou", " 😴 ", "  ");

        assertThat(dto.emoji()).isEqualTo("😴");
        assertThat(dto.label()).isNull();
        ArgumentCaptor<CoupleActivity> event = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().kind()).isEqualTo(CoupleActivity.MOOD);
        assertThat(event.getValue().detail()).isEqualTo("😴");
    }

    @Test
    void moodNeedsAnEmojiOfReasonableLength() {
        assertThatThrownBy(() -> service.setMood("lou", " ", null)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.setMood("lou", "x".repeat(17), null))
                .isInstanceOf(ContentValidationException.class);
        verify(events, never()).publishEvent(any());
    }

    @Test
    void togetherSinceCannotBeInTheFuture() {
        assertThatThrownBy(() -> service.setTogetherSince("lou", LocalDate.of(2026, 9, 24)))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void togetherSinceCanBeTodayOrCleared() {
        when(settings.findById(CoupleSettings.SINGLETON_ID)).thenReturn(Optional.empty());

        service.setTogetherSince("lou", LocalDate.of(2026, 9, 23));
        service.setTogetherSince("lou", null);

        verify(settings, times(2)).save(any(CoupleSettings.class));
    }

    @Test
    void noteIsBoundedAndItsTextNeverTravelsInTheEvent() {
        when(notes.save(any(CoupleNote.class))).thenAnswer(inv -> inv.getArgument(0));

        service.addNote("lou", "  Pense à prendre le pain  ");

        ArgumentCaptor<CoupleNote> saved = ArgumentCaptor.forClass(CoupleNote.class);
        verify(notes).save(saved.capture());
        assertThat(saved.getValue().getText()).isEqualTo("Pense à prendre le pain");
        ArgumentCaptor<CoupleActivity> event = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().detail()).isNull();

        assertThatThrownBy(() -> service.addNote("lou", "x".repeat(281)))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void onlyTheAuthorDeletesANote() {
        CoupleNote note = new CoupleNote(lou, "hello");
        when(notes.findById(4L)).thenReturn(Optional.of(note));

        assertThatThrownBy(() -> service.deleteNote("sam", 4L)).isInstanceOf(ForbiddenException.class);
        verify(notes, never()).delete(any());

        service.deleteNote("lou", 4L);
        verify(notes).delete(note);
    }

    @Test
    void thinkingOfYouIsSentAtMostOnceAMinute() {
        Instant[] now = {Instant.parse("2026-09-23T10:00:00Z")};
        Clock moving = new Clock() {
            @Override public ZoneId getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(ZoneId zone) { return this; }
            @Override public Instant instant() { return now[0]; }
        };
        service = new CoupleService(users, moods, notes, settings, new CoupleClock(ZoneId.of("Atlantic/Canary"), moving), events);

        service.thinkOfYou("lou");
        now[0] = now[0].plusSeconds(30);
        assertThatThrownBy(() -> service.thinkOfYou("lou")).isInstanceOf(TooSoonException.class);
        service.thinkOfYou("sam"); // each person has their own minute
        now[0] = now[0].plusSeconds(31);
        service.thinkOfYou("lou");

        ArgumentCaptor<CoupleActivity> event = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events, times(3)).publishEvent(event.capture());
        assertThat(event.getAllValues()).extracting(CoupleActivity::kind).containsOnly(CoupleActivity.THINKING);
        assertThat(event.getAllValues()).extracting(CoupleActivity::actorName).containsExactly("Lou", "Sam", "Lou");
    }
}
