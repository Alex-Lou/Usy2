package com.memocat.pet.dto;

import java.util.List;

/** Request bodies of the house API. Values are checked in HouseService. */
public final class HouseRequests {

    private HouseRequests() {
    }

    /** A whole scene, replaced at once; {@code version}: the one it was based on. */
    public record Layout(Integer version, List<HouseDto.Placed> items) {
    }
}
