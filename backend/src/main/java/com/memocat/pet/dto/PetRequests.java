package com.memocat.pet.dto;

/** Request bodies of the pet API. Values are checked in PetService. */
public final class PetRequests {

    private PetRequests() {
    }

    public record Action(String action) {
    }

    public record Name(String name) {
    }

    public record Equip(boolean equipped) {
    }

    public record Round(Integer score) {
    }
}
