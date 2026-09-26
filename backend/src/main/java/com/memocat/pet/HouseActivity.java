package com.memocat.pet;

import com.memocat.pet.dto.HouseDto;

/**
 * Someone bought, chose or placed something in the house. Broadcast on
 * /topic/house after commit so the other person's screen follows.
 */
public record HouseActivity(String action, Long actorId, String actorName, HouseDto house) {
}
