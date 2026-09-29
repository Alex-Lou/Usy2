package com.memocat.challenge;

import com.memocat.couple.CoupleActivity;
import com.memocat.couple.CoupleClock;
import com.memocat.domain.Asset;
import com.memocat.domain.PhotoChallengeEntry;
import com.memocat.domain.PhotoChallengeJoker;
import com.memocat.domain.User;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.PhotoChallengeEntryRepository;
import com.memocat.repository.PhotoChallengeJokerRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ForbiddenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChallengeServiceTest {

    // Wednesday: the week started on Monday 28 September.
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 30);
    private static final LocalDate WEEK = LocalDate.of(2026, 9, 28);

    @Mock private PhotoChallengeEntryRepository entries;
    @Mock private PhotoChallengeJokerRepository jokers;
    @Mock private UserRepository users;
    @Mock private AssetRepository assets;
    @Mock private ApplicationEventPublisher events;
    @Mock private CoupleClock clock;

    private ChallengeService service;
    private User lou;
    private User sam;
    private final List<PhotoChallengeEntry> posted = new ArrayList<>();

    @BeforeEach
    void setUp() {
        service = new ChallengeService(entries, jokers, users, assets, events, clock);
        lou = user(1L, "lou", "Lou");
        sam = user(2L, "sam", "Sam");
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(users.findByUsername("sam")).thenReturn(Optional.of(sam));
        lenient().when(clock.today()).thenReturn(TODAY);
        lenient().when(clock.now()).thenReturn(ZonedDateTime.of(2026, 9, 30, 12, 0, 0, 0, ZoneId.of("UTC")));
        lenient().when(entries.findByWeekStartOrderByIdAsc(WEEK)).thenReturn(posted);
        lenient().when(entries.save(any())).thenAnswer(i -> {
            PhotoChallengeEntry e = i.getArgument(0);
            ReflectionTestUtils.setField(e, "id", (long) posted.size() + 1);
            posted.add(e);
            return e;
        });
        lenient().when(jokers.findByIdWeekStartInOrderByCreatedAtAsc(List.of(WEEK))).thenReturn(List.of());
    }

    private static User user(Long id, String name, String display) {
        User u = new User(name, "hash", display);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private Asset photoOf(User owner, long id) {
        Asset a = new Asset("k" + id, "p.jpg", "image/jpeg", 10, owner);
        ReflectionTestUtils.setField(a, "id", id);
        lenient().when(assets.findById(id)).thenReturn(Optional.of(a));
        return a;
    }

    @Test
    void theWeekStartsOnMondayWithTheAppsTheme() {
        var week = service.thisWeek("lou");
        assertThat(week.weekStart()).isEqualTo(WEEK);
        assertThat(week.theme()).isEqualTo(Themes.of(WEEK));
        assertThat(week.themeBy()).isNull();
        assertThat(week.jokerAvailable()).isTrue();
    }

    @Test
    void theirPhotoStaysSecretUntilIPostMine() {
        photoOf(sam, 50L);
        photoOf(lou, 60L);
        service.post("sam", 50L, "Mon café");

        var before = service.thisWeek("lou");
        assertThat(before.theirsPosted()).isTrue();
        assertThat(before.theirs()).isNull();

        var after = service.post("lou", 60L, null);
        assertThat(after.theirs().assetId()).isEqualTo(50L);
        assertThat(after.mine().assetId()).isEqualTo(60L);
    }

    @Test
    void theOtherOneIsToldFirstThatItIsTheirTurnThenThatBothAreThere() {
        photoOf(sam, 50L);
        photoOf(lou, 60L);
        service.post("sam", 50L, null);
        service.post("lou", 60L, null);

        ArgumentCaptor<CoupleActivity> sent = ArgumentCaptor.forClass(CoupleActivity.class);
        verify(events, org.mockito.Mockito.times(2)).publishEvent(sent.capture());
        assertThat(sent.getAllValues()).extracting(CoupleActivity::kind)
                .containsExactly(CoupleActivity.CHALLENGE_POSTED, CoupleActivity.CHALLENGE_BOTH);
    }

    @Test
    void onlyMyOwnPhoto() {
        photoOf(sam, 50L);
        assertThatThrownBy(() -> service.post("lou", 50L, null)).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void theJokerIsOncePerPersonAndOnlyBeforeAnyPhoto() {
        when(jokers.existsById(any())).thenReturn(false, true);
        when(jokers.findByIdWeekStartInOrderByCreatedAtAsc(List.of(WEEK)))
                .thenReturn(List.of(new PhotoChallengeJoker(WEEK, 1L, "Un chat", Instant.now())));
        when(users.findById(1L)).thenReturn(Optional.of(lou));

        var week = service.joker("lou", "Un chat");
        assertThat(week.theme()).isEqualTo("Un chat");
        assertThat(week.themeBy()).isEqualTo("Lou");
        assertThat(week.jokerAvailable()).isFalse();
        assertThatThrownBy(() -> service.joker("lou", "Encore")).isInstanceOf(ConflictException.class);

        photoOf(sam, 50L);
        service.post("sam", 50L, null);
        assertThatThrownBy(() -> service.joker("sam", "Trop tard")).isInstanceOf(ConflictException.class);
    }

    @Test
    void themesTurnWeekAfterWeek() {
        assertThat(Themes.of(WEEK)).isNotEqualTo(Themes.of(WEEK.plusWeeks(1)));
        assertThat(Themes.of(WEEK)).isEqualTo(Themes.of(WEEK.plusWeeks(Themes.ALL.size())));
    }
}
