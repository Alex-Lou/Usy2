package com.memocat.pet;

import com.memocat.domain.Pet;
import com.memocat.domain.PetItem;
import com.memocat.domain.User;
import com.memocat.pet.dto.PetDto;
import com.memocat.pet.dto.PetDto.PetItemDto;
import com.memocat.repository.PetItemRepository;
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
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The shared cat. Needs go down slowly with time (computed on read, no
 * scheduler) and come back up with care; care also fills a shared purse
 * (capped per day) that buys accessories. Rapid repeated taps still animate
 * on screen but only count once every few seconds.
 */
@Service
public class PetService {

    public static final String PET = "pet";
    public static final String FEED = "feed";
    public static final String PLAY = "play";
    public static final String BRUSH = "brush";
    public static final String BATH = "bath";
    public static final String NAP = "nap";
    public static final String LASER = "laser";
    public static final String RENAME = "rename";
    public static final String SHOP = "shop";
    public static final String FISH = "fish";

    /** Points lost per hour: satiety, happiness, cleanliness, energy. */
    static final double[] DECAY_PER_HOUR = {3.0, 2.0, 1.5, 2.0};
    static final Duration COOLDOWN = Duration.ofSeconds(4);
    static final int DAILY_COINS = 60;
    static final int MAX_NAME = 24;

    /** What one (counted) action does: needs deltas, then coins earned. */
    private record Effect(int satiety, int happiness, int cleanliness, int energy, int coins) {
    }

    private static final Map<String, Effect> EFFECTS = Map.of(
            PET, new Effect(0, 8, 0, 0, 2),
            FEED, new Effect(35, 4, 0, 0, 2),
            PLAY, new Effect(-5, 15, 0, -8, 3),
            LASER, new Effect(0, 18, 0, -12, 3),
            BRUSH, new Effect(0, 5, 25, 0, 2),
            BATH, new Effect(0, -6, 100, 0, 2), // cats forgive, eventually
            NAP, new Effect(0, 0, 0, 45, 2));

    /**
     * A mini-game round: the score (checked against a plausible maximum) feeds
     * the cat and earns coins, within the same daily cap as care.
     */
    private record Game(int maxScore, int satietyPerPoint, int maxSatiety, int happiness, int energy,
                        int pointsPerCoin, int maxCoins) {
    }

    private static final Map<String, Game> GAMES = Map.of(
            FISH, new Game(80, 2, 40, 10, -6, 3, 10)); // each fish caught is a snack

    private final PetRepository pets;
    private final PetItemRepository items;
    private final UserRepository users;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Autowired
    public PetService(PetRepository pets, PetItemRepository items, UserRepository users,
                      ApplicationEventPublisher events) {
        this(pets, items, users, events, Clock.systemUTC());
    }

    PetService(PetRepository pets, PetItemRepository items, UserRepository users,
               ApplicationEventPublisher events, Clock clock) {
        this.pets = pets;
        this.items = items;
        this.users = users;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PetDto state() {
        Pet pet = requirePet();
        return toDto(pet, needsNow(pet, clock.instant()));
    }

    @Transactional
    public PetDto act(String username, String action) {
        Effect effect = EFFECTS.get(action);
        if (effect == null) {
            throw new ContentValidationException("Action inconnue");
        }
        User actor = requireUser(username);
        Pet pet = requirePet();
        Instant now = clock.instant();
        int[] needs = needsNow(pet, now);

        boolean counts = pet.getLastActionAt() == null || !now.isBefore(pet.getLastActionAt().plus(COOLDOWN));
        if (counts) {
            needs[0] += effect.satiety();
            needs[1] += effect.happiness();
            needs[2] += effect.cleanliness();
            needs[3] += effect.energy();
            LocalDate today = today();
            int earned = Math.min(effect.coins(), DAILY_COINS - pet.coinsEarnedOn(today));
            if (earned > 0) {
                pet.earn(earned, today);
            }
        }
        pet.setStats(clamp(needs[0]), clamp(needs[1]), clamp(needs[2]), clamp(needs[3]), now);
        pet.recordAction(action, actor, now);
        return publish(action, actor, pet);
    }

    @Transactional
    public PetDto playRound(String username, String gameId, Integer score) {
        Game game = GAMES.get(gameId);
        if (game == null) {
            throw new ContentValidationException("Jeu inconnu");
        }
        if (score == null || score < 0 || score > game.maxScore()) {
            throw new ContentValidationException("Score invalide");
        }
        User actor = requireUser(username);
        Pet pet = requirePet();
        Instant now = clock.instant();
        int[] needs = needsNow(pet, now);
        needs[0] += Math.min(game.maxSatiety(), score * game.satietyPerPoint());
        needs[1] += game.happiness();
        needs[3] += game.energy();
        LocalDate today = today();
        int earned = Math.min(Math.min(game.maxCoins(), score / game.pointsPerCoin()),
                DAILY_COINS - pet.coinsEarnedOn(today));
        if (earned > 0) {
            pet.earn(earned, today);
        }
        pet.setStats(clamp(needs[0]), clamp(needs[1]), clamp(needs[2]), clamp(needs[3]), now);
        pet.recordAction(gameId, actor, now);
        return publish(gameId, actor, pet);
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
        return publish(RENAME, actor, pet);
    }

    /** Buys an accessory with the shared purse and puts it on if its slot is free. */
    @Transactional
    public PetDto buy(String username, String itemId) {
        User actor = requireUser(username);
        PetCatalog.Item item = requireItem(itemId);
        if (items.existsById(item.id())) {
            throw new ContentValidationException("Déjà acheté");
        }
        Pet pet = requirePet();
        if (pet.getCoins() < item.price()) {
            throw new ContentValidationException("Pas assez de pièces");
        }
        pet.spend(item.price());
        PetItem bought = new PetItem(item.id());
        boolean slotFree = items.findAll().stream()
                .noneMatch(i -> i.isEquipped() && slotOf(i.getItem()).equals(item.slot()));
        bought.setEquipped(slotFree);
        items.save(bought);
        return publish(SHOP, actor, pet);
    }

    /** Wears or removes an owned accessory (one per slot). */
    @Transactional
    public PetDto equip(String username, String itemId, boolean equipped) {
        User actor = requireUser(username);
        PetCatalog.Item item = requireItem(itemId);
        PetItem owned = items.findById(item.id())
                .orElseThrow(() -> new ContentValidationException("Pas encore acheté"));
        if (equipped) {
            items.findAll().stream()
                    .filter(i -> i.isEquipped() && slotOf(i.getItem()).equals(item.slot()))
                    .forEach(i -> i.setEquipped(false));
        }
        owned.setEquipped(equipped);
        return publish(SHOP, actor, requirePet());
    }

    private PetDto publish(String action, User actor, Pet pet) {
        items.flush();
        PetDto dto = toDto(pet, needsNow(pet, clock.instant()));
        events.publishEvent(new PetActivity(action, actor.getId(), actor.getDisplayName(), dto));
        return dto;
    }

    private int[] needsNow(Pet pet, Instant now) {
        int[] stored = {pet.getSatiety(), pet.getHappiness(), pet.getCleanliness(), pet.getEnergy()};
        int[] out = new int[4];
        for (int i = 0; i < 4; i++) {
            out[i] = decayed(stored[i], DECAY_PER_HOUR[i], pet.getStatsAt(), now);
        }
        return out;
    }

    static int decayed(int value, double perHour, Instant since, Instant now) {
        double hours = Math.max(0, Duration.between(since, now).toSeconds() / 3600.0);
        return clamp((int) Math.round(value - perHour * hours));
    }

    static String mood(int satiety, int happiness, int cleanliness, int energy) {
        if (satiety < 25) {
            return "hungry";
        }
        if (energy < 20) {
            return "tired";
        }
        if (cleanliness < 25) {
            return "dirty";
        }
        if (happiness < 30) {
            return "bored";
        }
        return happiness >= 75 && satiety >= 50 ? "happy" : "content";
    }

    private LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
    }

    private static int clamp(int v) {
        return Math.max(0, Math.min(100, v));
    }

    private static String slotOf(String itemId) {
        return PetCatalog.find(itemId).map(PetCatalog.Item::slot).orElse("");
    }

    private PetDto toDto(Pet pet, int[] needs) {
        Map<String, PetItem> owned = items.findAll().stream()
                .collect(Collectors.toMap(PetItem::getItem, Function.identity()));
        List<PetItemDto> catalog = PetCatalog.ITEMS.stream()
                .map(i -> {
                    PetItem o = owned.get(i.id());
                    return new PetItemDto(i.id(), i.label(), i.slot(), i.price(), o != null, o != null && o.isEquipped());
                })
                .toList();
        User actor = pet.getLastActor();
        return new PetDto(pet.getName(), needs[0], needs[1], needs[2], needs[3],
                mood(needs[0], needs[1], needs[2], needs[3]),
                pet.getCoins(), DAILY_COINS - pet.coinsEarnedOn(today()), catalog,
                pet.getLastAction(), actor == null ? null : actor.getDisplayName(), pet.getLastActionAt());
    }

    private PetCatalog.Item requireItem(String id) {
        return PetCatalog.find(id).orElseThrow(() -> new ResourceNotFoundException("Unknown item"));
    }

    private Pet requirePet() {
        return pets.findById(Pet.SINGLETON_ID).orElseThrow(() -> new ResourceNotFoundException("Pet not found"));
    }

    private User requireUser(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
