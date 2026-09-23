package com.memocat.pet.dto;

import java.time.Instant;

/**
 * The cat as clients see it. {@code mood}: hungry, bored, happy or content.
 * {@code lastAction}: pet, feed or play (null if none yet).
 */
public record PetDto(String name, int satiety, int happiness, String mood,
                     String lastAction, String lastActorName, Instant lastActionAt) {
}
