package com.memocat.pet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.domain.HouseLayout;
import com.memocat.domain.Pet;
import com.memocat.domain.PetItem;
import com.memocat.domain.User;
import com.memocat.pet.dto.HouseDto;
import com.memocat.pet.dto.HouseDto.Placed;
import com.memocat.pet.dto.HouseRequests;
import com.memocat.repository.HouseLayoutRepository;
import com.memocat.repository.PetItemRepository;
import com.memocat.repository.PetRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ConflictException;
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
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HouseServiceTest {

    @Mock private HouseLayoutRepository layouts;
    @Mock private PetRepository pets;
    @Mock private PetItemRepository items;
    @Mock private UserRepository users;
    @Mock private ApplicationEventPublisher events;

    private final List<PetItem> owned = new ArrayList<>();
    private final HouseLayout inside = new HouseLayout(HouseLayout.INSIDE);
    private final HouseLayout outside = new HouseLayout(HouseLayout.OUTSIDE);
    private HouseService service;
    private Pet pet;

    @BeforeEach
    void setUp() throws ReflectiveOperationException {
        var ctor = Pet.class.getDeclaredConstructor();
        ctor.setAccessible(true);
        pet = ctor.newInstance();
        ReflectionTestUtils.setField(pet, "coins", 500);
        User lou = new User("lou", "h", "Lou");
        ReflectionTestUtils.setField(lou, "id", 1L);
        service = new HouseService(layouts, pets, items, users, events, new ObjectMapper(),
                Clock.fixed(Instant.parse("2026-09-26T20:00:00Z"), ZoneOffset.UTC));
        lenient().when(pets.findById(Pet.SINGLETON_ID)).thenReturn(Optional.of(pet));
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        lenient().when(items.findAll()).thenReturn(owned);
        lenient().when(items.existsById(anyString())).thenAnswer(a -> owned.stream().anyMatch(i -> i.getItem().equals(a.getArgument(0))));
        lenient().when(items.findById(anyString())).thenAnswer(a -> owned.stream().filter(i -> i.getItem().equals(a.getArgument(0))).findFirst());
        lenient().when(items.save(any())).thenAnswer(a -> {
            owned.add(a.getArgument(0));
            return a.getArgument(0);
        });
        lenient().when(layouts.findById(HouseLayout.INSIDE)).thenReturn(Optional.of(inside));
        lenient().when(layouts.findAllById(anyIterable())).thenReturn(List.of(inside, outside));
    }

    @Test
    void theCatalogIsSoundAndNeverClashesWithTheCatsAccessories() {
        Set<String> ids = new HashSet<>();
        for (HouseCatalog.Item item : HouseCatalog.ITEMS) {
            assertThat(ids.add(item.id())).as("unique %s", item.id()).isTrue();
            assertThat(item.id()).matches("[a-z0-9-]{1,20}");
            assertThat(item.label()).isNotBlank();
            assertThat(item.price()).isBetween(20, 200);
            assertThat(HouseCatalog.DECOR.equals(item.slot()) || HouseCatalog.SURFACES.contains(item.slot())).as(item.id()).isTrue();
            if (HouseCatalog.DECOR.equals(item.slot())) {
                assertThat(item.cat()).as("category of %s", item.id()).isNotBlank();
                assertThat(item.src()).as("drawing of %s", item.id()).isNotBlank();
            }
            assertThat(PetCatalog.find(item.id())).as("clash with an accessory: %s", item.id()).isEmpty();
        }
        assertThat(ids).hasSizeGreaterThan(200);
    }

    @Test
    void anObjectIsBoughtOnceAndNeverWornWhileASurfaceIsChosenIfItsPlaceIsFree() {
        HouseDto dto = service.buy("lou", "plante");
        assertThat(dto.coins()).isEqualTo(500 - 30);
        assertThat(item(dto, "plante").owned()).isTrue();
        assertThat(item(dto, "plante").equipped()).isFalse();
        assertThatThrownBy(() -> service.buy("lou", "plante")).isInstanceOf(ContentValidationException.class);

        dto = service.buy("lou", "sol-damier");
        assertThat(item(dto, "sol-damier").equipped()).isTrue();
        dto = service.buy("lou", "sol-tatami");
        assertThat(item(dto, "sol-tatami").equipped()).as("the damier is already down").isFalse();

        dto = service.choose("lou", "sol-tatami", true);
        assertThat(item(dto, "sol-tatami").equipped()).isTrue();
        assertThat(item(dto, "sol-damier").equipped()).isFalse();
        assertThatThrownBy(() -> service.choose("lou", "plante", true)).isInstanceOf(ContentValidationException.class);

        ArgumentCaptor<HouseActivity> event = ArgumentCaptor.forClass(HouseActivity.class);
        verify(events, org.mockito.Mockito.atLeastOnce()).publishEvent(event.capture());
        assertThat(event.getValue().action()).isEqualTo(HouseService.CHOOSE);
    }

    @Test
    void notEnoughCoinsBuysNothing() {
        ReflectionTestUtils.setField(pet, "coins", 10);
        assertThatThrownBy(() -> service.buy("lou", "chateau")).isInstanceOf(ContentValidationException.class);
        assertThat(owned).isEmpty();
        assertThat(pet.getCoins()).isEqualTo(10);
    }

    @Test
    void aSceneTakesOwnedObjectsAsManyTimesAsWantedWithinTheRoom() {
        service.buy("lou", "plante");
        HouseDto dto = service.saveLayout("lou", HouseLayout.INSIDE, new HouseRequests.Layout(0, List.of(
                new Placed("plante", 0.2, 0.8, 1, 0, false),
                new Placed("plante", 0.7, 0.8, 1.5, -10, true))));
        assertThat(inside.getItems()).contains("plante");
        assertThat(dto.layouts().get(HouseLayout.INSIDE).items()).hasSize(2);

        assertThatThrownBy(() -> save(new Placed("cactus", 0.5, 0.5, 1, 0, false)))
                .as("not bought").isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> save(new Placed("sol-damier", 0.5, 0.5, 1, 0, false)))
                .as("a surface is not placed").isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> save(new Placed("plante", 1.2, 0.5, 1, 0, false)))
                .as("outside the room").isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> save(new Placed("plante", 0.5, 0.5, 9, 0, false)))
                .as("far too big").isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> save(new Placed("plante", Double.NaN, 0.5, 1, 0, false)))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.saveLayout("lou", HouseLayout.INSIDE,
                new HouseRequests.Layout(0, Collections.nCopies(HouseService.MAX_PLACED + 1, new Placed("plante", 0.5, 0.5, 1, 0, false)))))
                .as("too many").isInstanceOf(ContentValidationException.class);
    }

    @Test
    void aSceneSavedOnAStaleVersionIsRefused() {
        ReflectionTestUtils.setField(inside, "version", 3);
        assertThatThrownBy(() -> service.saveLayout("lou", HouseLayout.INSIDE, new HouseRequests.Layout(2, List.of())))
                .isInstanceOf(ConflictException.class);
        when(layouts.saveAndFlush(any())).thenAnswer(a -> a.getArgument(0));
        service.saveLayout("lou", HouseLayout.INSIDE, new HouseRequests.Layout(3, List.of()));
        verify(layouts).saveAndFlush(inside);
    }

    private void save(Placed p) {
        service.saveLayout("lou", HouseLayout.INSIDE, new HouseRequests.Layout(0, List.of(p)));
    }

    private static HouseDto.HouseItemDto item(HouseDto dto, String id) {
        return dto.items().stream().filter(i -> i.id().equals(id)).findFirst().orElseThrow();
    }
}
