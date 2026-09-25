package com.memocat.pet;

import com.memocat.domain.Pet;
import com.memocat.domain.PetItem;
import com.memocat.domain.User;
import com.memocat.pet.dto.PetDto;
import com.memocat.repository.PetItemRepository;
import com.memocat.repository.PetRepository;
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
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PetServiceTest {

    @Mock private PetRepository pets;
    @Mock private PetItemRepository items;
    @Mock private UserRepository users;
    @Mock private ApplicationEventPublisher events;

    private final Instant t0 = Instant.parse("2026-09-23T10:00:00Z");
    private final MutableClock clock = new MutableClock(t0);
    private PetService service;
    private Pet pet;

    @BeforeEach
    void setUp() {
        pet = instantiatePet();
        pet.setName("Moka");
        pet.setStats(50, 50, 50, 50, t0);
        User lou = new User("lou", "h", "Lou");
        ReflectionTestUtils.setField(lou, "id", 1L);
        service = new PetService(pets, items, users, events, clock);
        lenient().when(pets.findById(Pet.SINGLETON_ID)).thenReturn(Optional.of(pet));
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
    }

    private static Pet instantiatePet() {
        try {
            var ctor = Pet.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            return ctor.newInstance();
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void fishingRoundFeedsTheCatAndEarnsCoins() {
        PetDto dto = service.playRound("lou", PetService.FISH, 12);
        assertThat(dto.satiety()).isEqualTo(50 + 24);  // 2 per fish
        assertThat(dto.happiness()).isEqualTo(60);
        assertThat(dto.energy()).isEqualTo(44);
        assertThat(dto.coins()).isEqualTo(4);          // 1 per 3 fish
        assertThat(dto.lastAction()).isEqualTo("fish");

        ArgumentCaptor<PetActivity> event = ArgumentCaptor.forClass(PetActivity.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().action()).isEqualTo("fish");
    }

    @Test
    void bigRoundIsCappedPerRoundAndPerDay() {
        PetDto dto = service.playRound("lou", PetService.FISH, 80);
        assertThat(dto.satiety()).isEqualTo(90);       // at most +40 food per round
        assertThat(dto.coins()).isEqualTo(10);         // at most 10 coins per round

        for (int i = 0; i < 10; i++) {
            dto = service.playRound("lou", PetService.FISH, 80);
        }
        assertThat(dto.coins()).isEqualTo(PetService.DAILY_COINS);
        assertThat(dto.coinsLeftToday()).isZero();
    }

    @Test
    void unknownGamesAndImpossibleScoresAreRefused() {
        assertThatThrownBy(() -> service.playRound("lou", "poker", 3)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.playRound("lou", PetService.FISH, 81)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.playRound("lou", PetService.FISH, -1)).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.playRound("lou", PetService.FISH, null)).isInstanceOf(ContentValidationException.class);
    }

    @Test
    void needsGoDownSlowlyWithTime() {
        clock.now = t0.plusSeconds(10 * 3600); // 10 h later
        PetDto dto = service.state();
        assertThat(dto.satiety()).isEqualTo(20);     // 50 - 3/h
        assertThat(dto.happiness()).isEqualTo(30);   // 50 - 2/h
        assertThat(dto.cleanliness()).isEqualTo(35); // 50 - 1.5/h
        assertThat(dto.energy()).isEqualTo(30);      // 50 - 2/h
        assertThat(dto.mood()).isEqualTo("hungry");
    }

    @Test
    void feedingPettingAndPlayingHelpAndAreBroadcast() {
        PetDto fed = service.act("lou", PetService.FEED);
        assertThat(fed.satiety()).isEqualTo(85);
        assertThat(fed.lastAction()).isEqualTo("feed");
        assertThat(fed.lastActorName()).isEqualTo("Lou");

        clock.now = t0.plusSeconds(10);
        PetDto played = service.act("lou", PetService.PLAY);
        assertThat(played.happiness()).isEqualTo(54 + 15);
        assertThat(played.satiety()).isEqualTo(80);
        assertThat(played.energy()).isEqualTo(42);
        assertThat(played.coins()).isEqualTo(5); // 2 + 3

        ArgumentCaptor<PetActivity> event = ArgumentCaptor.forClass(PetActivity.class);
        verify(events, org.mockito.Mockito.times(2)).publishEvent(event.capture());
        assertThat(event.getValue().action()).isEqualTo("play");
        assertThat(event.getValue().actorName()).isEqualTo("Lou");
    }

    @Test
    void rapidTapsAnimateButCountOnce() {
        service.act("lou", PetService.PET);
        clock.now = t0.plusSeconds(1);
        PetDto second = service.act("lou", PetService.PET);
        assertThat(second.happiness()).isEqualTo(58); // only the first counted
        assertThat(second.lastAction()).isEqualTo("pet"); // still broadcast for the animation
    }

    @Test
    void differentCaresInARowBothCount() {
        service.act("lou", PetService.FEED);
        clock.now = t0.plusSeconds(1);
        PetDto brushed = service.act("lou", PetService.BRUSH);
        assertThat(brushed.cleanliness()).isEqualTo(75); // 50 + 25: counted at once
        assertThat(brushed.happiness()).isEqualTo(59);   // 50 + 4 (feed) + 5 (brush)
    }

    @Test
    void valuesStayBetweenZeroAndHundred() {
        pet.setStats(95, 98, 90, 90, t0);
        PetDto dto = service.act("lou", PetService.FEED);
        assertThat(dto.satiety()).isEqualTo(100);
        assertThat(dto.happiness()).isEqualTo(100);
        assertThat(dto.mood()).isEqualTo("happy");
    }

    @Test
    void unknownActionsAndBadNamesAreRefused() {
        assertThatThrownBy(() -> service.act("lou", "kick")).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.rename("lou", "  ")).isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.rename("lou", "x".repeat(25))).isInstanceOf(ContentValidationException.class);
        assertThat(service.rename("lou", " Pixel ").name()).isEqualTo("Pixel");
    }

    @Test
    void careEarnsCoinsUpToADailyCap() {
        for (int i = 0; i < 40; i++) {
            clock.now = t0.plusSeconds(5L * i);
            service.act("lou", PetService.PET);
        }
        assertThat(pet.getCoins()).isEqualTo(PetService.DAILY_COINS);
        assertThat(service.state().coinsLeftToday()).isZero();

        clock.now = t0.plusSeconds(24 * 3600); // next day
        assertThat(service.act("lou", PetService.BRUSH).coins()).isEqualTo(62);
    }

    @Test
    void bathCleansButIsNotLoved() {
        PetDto dto = service.act("lou", PetService.BATH);
        assertThat(dto.cleanliness()).isEqualTo(100);
        assertThat(dto.happiness()).isEqualTo(44);
    }

    @Test
    void shopNeedsEnoughCoinsAndWearsTheItemIfTheSlotIsFree() {
        assertThatThrownBy(() -> service.buy("lou", "collar")).isInstanceOf(ContentValidationException.class)
                .hasMessageContaining("pièces");
        pet.earn(100, java.time.LocalDate.of(2026, 1, 1));
        when(items.existsById("collar")).thenReturn(false);
        when(items.findAll()).thenReturn(java.util.List.of());

        service.buy("lou", "collar");

        ArgumentCaptor<PetItem> saved = ArgumentCaptor.forClass(PetItem.class);
        verify(items).save(saved.capture());
        assertThat(saved.getValue().isEquipped()).isTrue();
        assertThat(pet.getCoins()).isEqualTo(70);
    }

    @Test
    void wearingAnItemTakesOffTheOtherOneInTheSameSlot() {
        PetItem collar = new PetItem("collar");
        collar.setEquipped(true);
        PetItem bow = new PetItem("bow");
        PetItem beret = new PetItem("beret");
        beret.setEquipped(true);
        when(items.findById("bow")).thenReturn(Optional.of(bow));
        when(items.findAll()).thenReturn(java.util.List.of(collar, bow, beret));

        service.equip("lou", "bow", true);

        assertThat(bow.isEquipped()).isTrue();
        assertThat(collar.isEquipped()).isFalse(); // same slot (neck)
        assertThat(beret.isEquipped()).isTrue();   // other slot untouched
        assertThatThrownBy(() -> service.equip("lou", "crown", true)).isInstanceOf(ContentValidationException.class);
    }

    private static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
