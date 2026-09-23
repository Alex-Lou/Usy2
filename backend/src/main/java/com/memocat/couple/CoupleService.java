package com.memocat.couple;

import com.memocat.couple.dto.CoupleDto;
import com.memocat.couple.dto.MoodDto;
import com.memocat.couple.dto.NoteDto;
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
import com.memocat.web.PageResponse;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/** The shared "Nous" space: since when, each person's live mood, and short notes. */
@Service
public class CoupleService {

    static final int MAX_EMOJI = 16;
    static final int MAX_MOOD_LABEL = 40;
    static final int MAX_NOTE = 280;
    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository users;
    private final MoodRepository moods;
    private final CoupleNoteRepository notes;
    private final CoupleSettingsRepository settings;
    private final CoupleClock clock;
    private final ApplicationEventPublisher events;

    public CoupleService(UserRepository users, MoodRepository moods, CoupleNoteRepository notes,
                         CoupleSettingsRepository settings, CoupleClock clock, ApplicationEventPublisher events) {
        this.users = users;
        this.moods = moods;
        this.notes = notes;
        this.settings = settings;
        this.clock = clock;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public CoupleDto overview() {
        LocalDate since = settings.findById(CoupleSettings.SINGLETON_ID)
                .map(CoupleSettings::getTogetherSince)
                .orElse(null);
        List<User> everyone = users.findAll().stream().sorted(Comparator.comparing(User::getId)).toList();
        List<MoodDto> moodList = everyone.stream()
                .map(u -> moods.findById(u.getId()))
                .flatMap(Optional::stream)
                .map(MoodDto::from)
                .toList();
        List<NoteDto> latest = everyone.stream()
                .map(u -> notes.findFirstByAuthorIdOrderByCreatedAtDescIdDesc(u.getId()))
                .flatMap(Optional::stream)
                .map(NoteDto::from)
                .toList();
        return new CoupleDto(since, moodList, latest);
    }

    @Transactional
    public MoodDto setMood(String username, String emoji, String label) {
        User me = requireUser(username);
        String e = Texts.required(emoji, MAX_EMOJI, "L'humeur");
        String l = Texts.optional(label, MAX_MOOD_LABEL, "Le texte de l'humeur");
        Mood mood = moods.findById(me.getId()).orElseGet(() -> new Mood(me.getId()));
        mood.set(e, l);
        Mood saved = moods.saveAndFlush(mood); // flush: updatedAt is set for the response
        events.publishEvent(CoupleActivity.of(CoupleActivity.MOOD, me, e, null));
        return MoodDto.from(saved);
    }

    @Transactional
    public void setTogetherSince(String username, LocalDate date) {
        User me = requireUser(username);
        if (date != null && date.isAfter(clock.today())) {
            throw new ContentValidationException("La date ne peut pas être dans le futur");
        }
        CoupleSettings s = settings.findById(CoupleSettings.SINGLETON_ID).orElseGet(CoupleSettings::create);
        s.setTogetherSince(date);
        settings.save(s);
        events.publishEvent(CoupleActivity.of(CoupleActivity.TOGETHER, me, null, null));
    }

    @Transactional(readOnly = true)
    public PageResponse<NoteDto> listNotes(int page, int size) {
        int clamped = size <= 0 ? 20 : Math.min(size, MAX_PAGE_SIZE);
        return PageResponse.of(
                notes.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(Math.max(page, 0), clamped)),
                NoteDto::from);
    }

    @Transactional
    public NoteDto addNote(String username, String text) {
        User me = requireUser(username);
        CoupleNote note = notes.save(new CoupleNote(me, Texts.required(text, MAX_NOTE, "Le mot")));
        events.publishEvent(CoupleActivity.of(CoupleActivity.NOTE, me, null, note.getId()));
        return NoteDto.from(note);
    }

    @Transactional
    public void deleteNote(String username, Long noteId) {
        User me = requireUser(username);
        CoupleNote note = notes.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
        if (!note.getAuthor().getId().equals(me.getId())) {
            throw new ForbiddenException("You can only delete your own notes");
        }
        notes.delete(note);
    }

    private User requireUser(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
