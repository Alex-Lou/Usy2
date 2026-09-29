package com.memocat.challenge;

import com.memocat.challenge.ChallengeDtos.EntryDto;
import com.memocat.challenge.ChallengeDtos.PastWeekDto;
import com.memocat.challenge.ChallengeDtos.WeekDto;
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
import com.memocat.web.ContentValidationException;
import com.memocat.web.ForbiddenException;
import com.memocat.web.PageResponse;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 📸 Défi photo de la semaine: a theme each week (the app's, or a joker's), one
 * photo each; the other one's photo shows only once mine is posted. Past weeks
 * show both.
 */
@Service
public class ChallengeService {

    static final int MAX_THEME = 80;
    static final int MAX_CAPTION = 200;
    static final int HISTORY_WEEKS = 8;

    private final PhotoChallengeEntryRepository entries;
    private final PhotoChallengeJokerRepository jokers;
    private final UserRepository users;
    private final AssetRepository assets;
    private final ApplicationEventPublisher events;
    private final CoupleClock clock;

    public ChallengeService(PhotoChallengeEntryRepository entries, PhotoChallengeJokerRepository jokers,
                            UserRepository users, AssetRepository assets, ApplicationEventPublisher events,
                            CoupleClock clock) {
        this.entries = entries;
        this.jokers = jokers;
        this.users = users;
        this.assets = assets;
        this.events = events;
        this.clock = clock;
    }

    LocalDate currentWeek() {
        return clock.today().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    @Transactional(readOnly = true)
    public WeekDto thisWeek(String username) {
        User me = requireUser(username);
        LocalDate week = currentWeek();
        List<PhotoChallengeEntry> posted = entries.findByWeekStartOrderByIdAsc(week);
        List<PhotoChallengeJoker> weekJokers = jokers.findByIdWeekStartInOrderByCreatedAtAsc(List.of(week));
        Optional<PhotoChallengeEntry> mine = posted.stream().filter(e -> isMine(e, me)).findFirst();
        Optional<PhotoChallengeEntry> theirs = posted.stream().filter(e -> !isMine(e, me)).findFirst();
        PhotoChallengeJoker latest = weekJokers.isEmpty() ? null : weekJokers.get(weekJokers.size() - 1);
        String themeBy = latest == null ? null
                : users.findById(latest.getUserId()).map(User::getDisplayName).orElse(null);
        boolean jokerAvailable = posted.isEmpty() && weekJokers.stream().noneMatch(j -> j.getUserId().equals(me.getId()));
        return new WeekDto(week, latest == null ? Themes.of(week) : latest.getTheme(), themeBy, jokerAvailable,
                mine.map(EntryDto::from).orElse(null), theirs.isPresent(),
                mine.isPresent() ? theirs.map(EntryDto::from).orElse(null) : null);
    }

    /** Posts (or replaces, during the week) my photo; the other one hears about it. */
    @Transactional
    public WeekDto post(String username, Long assetId, String caption) {
        User me = requireUser(username);
        Asset asset = assets.findById(assetId == null ? -1L : assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo introuvable"));
        if (!asset.getUploader().getId().equals(me.getId())) throw new ForbiddenException("Ce n'est pas ta photo");
        if (asset.getContentType() == null || !asset.getContentType().startsWith("image/")) {
            throw new ContentValidationException("Il faut une photo");
        }
        String text = caption == null || caption.isBlank() ? null : caption.strip();
        if (text != null && text.length() > MAX_CAPTION) {
            throw new ContentValidationException("La légende est trop longue (max " + MAX_CAPTION + ")");
        }
        LocalDate week = currentWeek();
        List<PhotoChallengeEntry> posted = entries.findByWeekStartOrderByIdAsc(week);
        Optional<PhotoChallengeEntry> mine = posted.stream().filter(e -> isMine(e, me)).findFirst();
        boolean theirsPosted = posted.stream().anyMatch(e -> !isMine(e, me));
        if (mine.isPresent()) {
            mine.get().replace(asset, text, clock.now().toInstant());
        } else {
            entries.save(new PhotoChallengeEntry(week, me, asset, text, clock.now().toInstant()));
            String theme = thisWeek(username).theme();
            events.publishEvent(CoupleActivity.of(theirsPosted ? CoupleActivity.CHALLENGE_BOTH : CoupleActivity.CHALLENGE_POSTED,
                    me, theme, null));
        }
        return thisWeek(username);
    }

    /** Replaces this week's theme: once each, and only while nobody has posted. */
    @Transactional
    public WeekDto joker(String username, String theme) {
        User me = requireUser(username);
        String text = theme == null ? "" : theme.strip();
        if (text.isEmpty()) throw new ContentValidationException("Le thème est vide");
        if (text.length() > MAX_THEME) throw new ContentValidationException("Le thème est trop long (max " + MAX_THEME + ")");
        LocalDate week = currentWeek();
        if (!entries.findByWeekStartOrderByIdAsc(week).isEmpty()) {
            throw new ConflictException("Une photo est déjà postée : le thème ne change plus");
        }
        if (jokers.existsById(new PhotoChallengeJoker.Key(week, me.getId()))) {
            throw new ConflictException("Tu as déjà utilisé ton joker cette semaine");
        }
        jokers.save(new PhotoChallengeJoker(week, me.getId(), text, clock.now().toInstant()));
        return thisWeek(username);
    }

    /** Past weeks with photos, most recent first, both photos shown. */
    @Transactional(readOnly = true)
    public PageResponse<PastWeekDto> history(int page) {
        Page<LocalDate> weeks = entries.findWeeksBefore(currentWeek(), PageRequest.of(Math.max(0, page), HISTORY_WEEKS));
        Map<LocalDate, List<EntryDto>> byWeek = entries.findByWeekStartInOrderByWeekStartDescIdAsc(weeks.getContent()).stream()
                .collect(Collectors.groupingBy(PhotoChallengeEntry::getWeekStart,
                        Collectors.mapping(EntryDto::from, Collectors.toList())));
        Map<LocalDate, String> themes = jokers.findByIdWeekStartInOrderByCreatedAtAsc(weeks.getContent()).stream()
                .collect(Collectors.toMap(PhotoChallengeJoker::getWeekStart, PhotoChallengeJoker::getTheme, (a, b) -> b));
        return PageResponse.of(weeks, w -> new PastWeekDto(w, themes.getOrDefault(w, Themes.of(w)),
                byWeek.getOrDefault(w, List.of()).stream().sorted(Comparator.comparing(EntryDto::id)).toList()));
    }

    private static boolean isMine(PhotoChallengeEntry e, User me) {
        return e.getAuthor().getId().equals(me.getId());
    }

    private User requireUser(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
