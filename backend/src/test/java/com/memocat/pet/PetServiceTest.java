package com.memocat.pet;

import com.memocat.domain.Pet;
import com.memocat.domain.User;
import com.memocat.pet.dto.PetDto;
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
        pet.setStats(50, 50, t0);
        User lou = new User("lou", "h", "Lou");
        ReflectionTestUtils.setField(lou, "id", 1L);
        service = new PetService(pets, users, events, clock);
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
    void needsGoDownSlowlyWithTime() {
        clock.now = t0.plusSeconds(10 * 3600); // 10 h later
        PetDto dto = service.state();
        assertThat(dto.satiety()).isEqualTo(20);   // 50 - 3/h
        assertThat(dto.happiness()).isEqualTo(30); // 50 - 2/h
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
    void valuesStayBetweenZeroAndHundred() {
        pet.setStats(95, 98, t0);
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
