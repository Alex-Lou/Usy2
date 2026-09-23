package com.memocat.pet;

import com.memocat.domain.Pet;
import com.memocat.domain.User;
import com.memocat.pet.dto.PetDto;
import com.memocat.repository.PetRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * The shared cat. Needs go down slowly with time (computed on read, no
 * scheduler) and come back up when one of the two looks after it. Rapid
 * repeated taps still animate on screen but only count once every few seconds.
 */
@Service
public class PetService {

    public static final String PET = "pet";
    public static final String FEED = "feed";
    public static final String PLAY = "play";
    public static final String RENAME = "rename";

    /** Points lost per hour. A full cat gets hungry after about a day. */
    static final double SATIETY_DECAY_PER_HOUR = 3.0;
    static final double HAPPINESS_DECAY_PER_HOUR = 2.0;
    static final Duration COOLDOWN = Duration.ofSeconds(4);
    static final int MAX_NAME = 24;

    private final PetRepository pets;
    private final UserRepository users;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Autowired
    public PetService(PetRepository pets, UserRepository users, ApplicationEventPublisher events) {
        this(pets, users, events, Clock.systemUTC());
    }

    PetService(PetRepository pets, UserRepository users, ApplicationEventPublisher events, Clock clock) {
        this.pets = pets;
        this.users = users;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PetDto state() {
        return state(requirePet());
    }

    @Transactional
    public PetDto act(String username, String action) {
        if (!PET.equals(action) && !FEED.equals(action) && !PLAY.equals(action)) {
            throw new ContentValidationException("Action inconnue");
        }
        User actor = requireUser(username);
        Pet pet = requirePet();
        Instant now = clock.instant();
        int satiety = decayed(pet.getSatiety(), SATIETY_DECAY_PER_HOUR, pet.getStatsAt(), now);
        int happiness = decayed(pet.getHappiness(), HAPPINESS_DECAY_PER_HOUR, pet.getStatsAt(), now);

        boolean counts = pet.getLastActionAt() == null || !now.isBefore(pet.getLastActionAt().plus(COOLDOWN));
        if (counts) {
            switch (action) {
                case PET -> happiness += 8;
                case FEED -> {
                    satiety += 35;
                    happiness += 4;
                }
                default -> { // play: fun, and a little tiring
                    happiness += 15;
                    satiety -= 5;
                }
            }
        }
        pet.setStats(clamp(satiety), clamp(happiness), now);
        pet.recordAction(action, actor, now);
        PetDto dto = toDto(pet, pet.getSatiety(), pet.getHappiness());
        events.publishEvent(new PetActivity(action, actor.getId(), actor.getDisplayName(), dto));
        return dto;
    }

    @Transactional
    public PetDto rename(String username, String name) {
        User actor = requireUser(username);
        String clean = name == null ? "" : name.strip();
        if (clean.isEmpty() || clean.length() > MAX_NAME) {
            throw new ContentValidationException("Le nom doit faire entre 1 et " + MAX_NAME + " caractères");
        }
        Pet pet = requirePet();
        pet.setName(clean);
        PetDto dto = state(pet);
        events.publishEvent(new PetActivity(RENAME, actor.getId(), actor.getDisplayName(), dto));
        return dto;
    }

    private PetDto state(Pet pet) {
        Instant now = clock.instant();
        return toDto(pet, decayed(pet.getSatiety(), SATIETY_DECAY_PER_HOUR, pet.getStatsAt(), now),
                decayed(pet.getHappiness(), HAPPINESS_DECAY_PER_HOUR, pet.getStatsAt(), now));
    }

    static int decayed(int value, double perHour, Instant since, Instant now) {
        double hours = Math.max(0, Duration.between(since, now).toSeconds() / 3600.0);
        return clamp((int) Math.round(value - perHour * hours));
    }

    static String mood(int satiety, int happiness) {
        if (satiety < 25) {
            return "hungry";
        }
        if (happiness < 30) {
            return "bored";
        }
        return happiness >= 75 && satiety >= 50 ? "happy" : "content";
    }

    private static int clamp(int v) {
        return Math.max(0, Math.min(100, v));
    }

    private static PetDto toDto(Pet pet, int satiety, int happiness) {
        User actor = pet.getLastActor();
        return new PetDto(pet.getName(), satiety, happiness, mood(satiety, happiness), pet.getLastAction(),
                actor == null ? null : actor.getDisplayName(), pet.getLastActionAt());
    }

    private Pet requirePet() {
        return pets.findById(Pet.SINGLETON_ID).orElseThrow(() -> new ResourceNotFoundException("Pet not found"));
    }

    private User requireUser(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
