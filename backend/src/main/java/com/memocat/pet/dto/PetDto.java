package com.memocat.pet.dto;

import java.time.Instant;
import java.util.List;

/**
 * The cat as clients see it. Needs are 0..100. {@code mood}: hungry, tired,
 * dirty, bored, happy or content. {@code items}: the whole catalog with what
 * is owned / worn. {@code coinsLeftToday}: how much care can still earn today.
 */
public record PetDto(String name, int satiety, int happiness, int cleanliness, int energy, String mood,
                     int coins, int coinsLeftToday, List<PetItemDto> items,
                     String lastAction, String lastActorName, Instant lastActionAt) {

    public record PetItemDto(String id, String label, String slot, int price, boolean owned, boolean equipped) {
    }
}
