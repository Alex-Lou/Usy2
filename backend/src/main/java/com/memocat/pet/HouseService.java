package com.memocat.pet;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.domain.HouseLayout;
import com.memocat.domain.Pet;
import com.memocat.domain.PetItem;
import com.memocat.domain.User;
import com.memocat.pet.dto.HouseDto;
import com.memocat.pet.dto.HouseDto.HouseItemDto;
import com.memocat.pet.dto.HouseDto.LayoutDto;
import com.memocat.pet.dto.HouseDto.Placed;
import com.memocat.pet.dto.HouseRequests;
import com.memocat.repository.HouseLayoutRepository;
import com.memocat.repository.PetItemRepository;
import com.memocat.repository.PetRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 🏡 The house, decorated together: its objects and surfaces are bought with
 * the cat's shared purse (same ownership table as the accessories). A bought
 * object can be placed as many times as wanted, anywhere in a scene; each
 * scene is saved whole, and only over the version it was based on.
 */
@Service
public class HouseService {

    public static final String BUY = "buy";
    public static final String CHOOSE = "choose";
    public static final String LAYOUT = "layout";

    static final List<String> SCENES = List.of(HouseLayout.INSIDE, HouseLayout.OUTSIDE);
    static final int MAX_PLACED = 150;
    static final double MIN_SCALE = 0.2;
    static final double MAX_SCALE = 5;

    private final HouseLayoutRepository layouts;
    private final PetRepository pets;
    private final PetItemRepository items;
    private final UserRepository users;
    private final ApplicationEventPublisher events;
    private final ObjectMapper json;
    private final Clock clock;

    @Autowired
    public HouseService(HouseLayoutRepository layouts, PetRepository pets, PetItemRepository items, UserRepository users,
                        ApplicationEventPublisher events, ObjectMapper json) {
        this(layouts, pets, items, users, events, json, Clock.systemUTC());
    }

    HouseService(HouseLayoutRepository layouts, PetRepository pets, PetItemRepository items, UserRepository users,
                 ApplicationEventPublisher events, ObjectMapper json, Clock clock) {
        this.layouts = layouts;
        this.pets = pets;
        this.items = items;
        this.users = users;
        this.events = events;
        this.json = json;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public HouseDto state() {
        return toDto(requirePet());
    }

    /** Buys an object or a surface; a surface is chosen right away if none of its kind is. */
    @Transactional
    public HouseDto buy(String username, String itemId) {
        User actor = requireUser(username);
        HouseCatalog.Item item = requireItem(itemId);
        if (items.existsById(item.id())) {
            throw new ContentValidationException("Déjà acheté");
        }
        Pet pet = requirePet();
        if (pet.getCoins() < item.price()) {
            throw new ContentValidationException("Pas assez de pièces");
        }
        pet.spend(item.price());
        PetItem bought = new PetItem(item.id());
        bought.setEquipped(isSurface(item) && items.findAll().stream()
                .noneMatch(i -> i.isEquipped() && slotOf(i.getItem()).equals(item.slot())));
        items.save(bought);
        return publish(BUY, actor, pet);
    }

    /** Chooses (or puts away) an owned surface: one per kind. Objects are placed, not chosen. */
    @Transactional
    public HouseDto choose(String username, String itemId, boolean equipped) {
        User actor = requireUser(username);
        HouseCatalog.Item item = requireItem(itemId);
        if (!isSurface(item)) {
            throw new ContentValidationException("Cet objet se pose dans la maison");
        }
        PetItem owned = items.findById(item.id())
                .orElseThrow(() -> new ContentValidationException("Pas encore acheté"));
        if (equipped) {
            items.findAll().stream()
                    .filter(i -> i.isEquipped() && slotOf(i.getItem()).equals(item.slot()))
                    .forEach(i -> i.setEquipped(false));
        }
        owned.setEquipped(equipped);
        return publish(CHOOSE, actor, requirePet());
    }

    /** Replaces a whole scene with the given objects, if nobody saved it in between. */
    @Transactional
    public HouseDto saveLayout(String username, String scene, HouseRequests.Layout request) {
        User actor = requireUser(username);
        if (!SCENES.contains(scene)) {
            throw new ResourceNotFoundException("Unknown scene");
        }
        if (request == null || request.version() == null || request.items() == null) {
            throw new ContentValidationException("Disposition incomplète");
        }
        List<Placed> placed = request.items();
        if (placed.size() > MAX_PLACED) {
            throw new ContentValidationException("Pas plus de " + MAX_PLACED + " objets par pièce");
        }
        Set<String> owned = items.findAll().stream().map(PetItem::getItem).collect(Collectors.toSet());
        for (Placed p : placed) {
            check(p, owned);
        }
        HouseLayout layout = layouts.findById(scene).orElseThrow(() -> new ResourceNotFoundException("Scene not found"));
        if (layout.getVersion() != request.version()) {
            throw new ConflictException("La maison a changé entre-temps : recharge pour voir la dernière version");
        }
        layout.replace(write(placed), actor, clock.instant());
        try {
            layouts.saveAndFlush(layout);
        } catch (ObjectOptimisticLockingFailureException e) {
            throw new ConflictException("La maison a changé entre-temps : recharge pour voir la dernière version");
        }
        return publish(LAYOUT, actor, requirePet());
    }

    private static void check(Placed p, Set<String> owned) {
        if (p == null || p.item() == null) {
            throw new ContentValidationException("Objet inconnu");
        }
        HouseCatalog.Item item = HouseCatalog.find(p.item())
                .filter(i -> HouseCatalog.DECOR.equals(i.slot()))
                .orElseThrow(() -> new ContentValidationException("Objet inconnu : " + p.item()));
        if (!owned.contains(item.id())) {
            throw new ContentValidationException("Pas encore acheté : " + item.label());
        }
        if (!within(p.x(), 0, 1) || !within(p.y(), 0, 1) || !within(p.s(), MIN_SCALE, MAX_SCALE) || !within(p.r(), -180, 180)) {
            throw new ContentValidationException("Objet hors de la pièce : " + item.label());
        }
    }

    private static boolean within(double v, double min, double max) {
        return Double.isFinite(v) && v >= min && v <= max;
    }

    private HouseDto publish(String action, User actor, Pet pet) {
        items.flush();
        HouseDto dto = toDto(pet);
        events.publishEvent(new HouseActivity(action, actor.getId(), actor.getDisplayName(), dto));
        return dto;
    }

    private HouseDto toDto(Pet pet) {
        Map<String, PetItem> owned = items.findAll().stream()
                .collect(Collectors.toMap(PetItem::getItem, Function.identity()));
        List<HouseItemDto> catalog = HouseCatalog.ITEMS.stream()
                .map(i -> {
                    PetItem o = owned.get(i.id());
                    return new HouseItemDto(i.id(), i.label(), i.slot(), i.cat(), i.price(), o != null, o != null && o.isEquipped());
                })
                .toList();
        Map<String, LayoutDto> scenes = new LinkedHashMap<>();
        for (HouseLayout layout : layouts.findAllById(SCENES)) {
            scenes.put(layout.getScene(), new LayoutDto(layout.getVersion(), read(layout.getItems())));
        }
        return new HouseDto(pet.getCoins(), catalog, scenes);
    }

    private String write(List<Placed> placed) {
        try {
            return json.writeValueAsString(placed);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private List<Placed> read(String stored) {
        try {
            return json.readValue(stored, new TypeReference<List<Placed>>() { });
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private static boolean isSurface(HouseCatalog.Item item) {
        return HouseCatalog.SURFACES.contains(item.slot());
    }

    private static String slotOf(String itemId) {
        return HouseCatalog.find(itemId).map(HouseCatalog.Item::slot).orElse("");
    }

    private HouseCatalog.Item requireItem(String id) {
        return HouseCatalog.find(id).orElseThrow(() -> new ResourceNotFoundException("Unknown item"));
    }

    private Pet requirePet() {
        return pets.findById(Pet.SINGLETON_ID).orElseThrow(() -> new ResourceNotFoundException("Pet not found"));
    }

    private User requireUser(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
