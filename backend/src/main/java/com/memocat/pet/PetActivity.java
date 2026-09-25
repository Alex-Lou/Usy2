package com.memocat.pet;

import com.memocat.pet.dto.PetDto;

/**
 * Someone interacted with the cat (or renamed it). Broadcast on /topic/pet
 * after commit so the other person's screen plays the same animation.
 */
public record PetActivity(String action, Long actorId, String actorName, PetDto pet) {
}
