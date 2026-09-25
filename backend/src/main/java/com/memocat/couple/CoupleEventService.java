package com.memocat.couple;

import com.memocat.couple.dto.CoupleEventDto;
import com.memocat.couple.dto.CoupleRequests.EventRequest;
import com.memocat.domain.CoupleEvent;
import com.memocat.domain.User;
import com.memocat.repository.CoupleEventRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * The shared calendar ("Nos dates"): both people add, change or remove any
 * date. The evening before an event (from {@link #REMIND_FROM}, the couple's
 * time), both get a reminder, once per occurrence.
 */
@Service
public class CoupleEventService {

    static final int MAX_EVENTS = 300;
    static final int MAX_TITLE = 60;
    static final int MAX_NOTE = 300;
    static final int MAX_EMOJI = 16;
    static final LocalTime REMIND_FROM = LocalTime.of(19, 0);

    private final CoupleEventRepository events;
    private final UserRepository users;
    private final CoupleClock clock;
    private final ApplicationEventPublisher publisher;

    public CoupleEventService(CoupleEventRepository events, UserRepository users, CoupleClock clock,
                              ApplicationEventPublisher publisher) {
        this.events = events;
        this.users = users;
        this.clock = clock;
        this.publisher = publisher;
    }

    @Transactional(readOnly = true)
    public List<CoupleEventDto> all() {
        return events.findAllByOrderByDayAscTimeAscIdAsc().stream().map(CoupleEventService::toDto).toList();
    }

    @Transactional
    public CoupleEventDto create(String username, EventRequest request) {
        User me = requireUser(username);
        if (events.count() >= MAX_EVENTS) {
            throw new ContentValidationException("Trop de dates (max " + MAX_EVENTS + ")");
        }
        CoupleEvent event = new CoupleEvent(me);
        apply(event, request);
        return changed(me, events.save(event));
    }

    @Transactional
    public CoupleEventDto update(String username, Long id, EventRequest request) {
        User me = requireUser(username);
        CoupleEvent event = requireEvent(id);
        apply(event, request);
        return changed(me, event);
    }

    @Transactional
    public void delete(String username, Long id) {
        User me = requireUser(username);
        CoupleEvent event = requireEvent(id);
        events.delete(event);
        publisher.publishEvent(CoupleActivity.of(CoupleActivity.EVENTS, me, null, id));
    }

    /**
     * From the evening before, claims and announces tomorrow's events. Each
     * occurrence is claimed by a conditional update, so it is sent only once
     * even if this runs again (or on another instance).
     */
    @Transactional
    public int remindTomorrow() {
        ZonedDateTime now = clock.now();
        if (now.toLocalTime().isBefore(REMIND_FROM)) {
            return 0;
        }
        LocalDate tomorrow = now.toLocalDate().plusDays(1);
        int sent = 0;
        for (CoupleEvent event : events.findCandidatesFor(tomorrow)) {
            if (event.occursOn(tomorrow) && events.markReminded(event.getId(), tomorrow) == 1) {
                publisher.publishEvent(new EventReminder(event.getId(), event.getTitle(), event.getEmoji(), event.getTime()));
                sent++;
            }
        }
        return sent;
    }

    private void apply(CoupleEvent event, EventRequest request) {
        if (request == null || request.date() == null) {
            throw new ContentValidationException("La date est requise");
        }
        event.edit(Texts.required(request.title(), MAX_TITLE, "Le titre"),
                request.date(),
                request.time() == null ? null : request.time().withSecond(0).withNano(0),
                Texts.optional(request.emoji(), MAX_EMOJI, "L'emoji"),
                Texts.optional(request.note(), MAX_NOTE, "La note"),
                request.yearly());
    }

    private CoupleEventDto changed(User me, CoupleEvent event) {
        publisher.publishEvent(CoupleActivity.of(CoupleActivity.EVENTS, me, null, event.getId()));
        return toDto(event);
    }

    private static CoupleEventDto toDto(CoupleEvent e) {
        return new CoupleEventDto(e.getId(), e.getTitle(), e.getDay(), e.getTime(), e.getEmoji(), e.getNote(),
                e.isYearly(), e.getCreatedBy().getId(), e.getCreatedAt());
    }

    private CoupleEvent requireEvent(Long id) {
        return events.findById(id).orElseThrow(() -> new ResourceNotFoundException("Event not found"));
    }

    private User requireUser(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
