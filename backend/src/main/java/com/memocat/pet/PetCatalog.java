package com.memocat.pet;

import java.util.List;
import java.util.Optional;

/**
 * The accessories on sale. One item per slot can be worn at a time
 * (neck, head, face) and one cushion in the house.
 */
public final class PetCatalog {

    public record Item(String id, String label, String slot, int price) {
    }

    public static final List<Item> ITEMS = List.of(
            new Item("collar", "Collier à grelot", "neck", 30),
            new Item("bow", "Nœud", "neck", 40),
            new Item("scarf", "Écharpe", "neck", 50),
            new Item("glasses", "Lunettes rondes", "face", 45),
            new Item("beret", "Béret", "head", 60),
            new Item("crown", "Couronne", "head", 120),
            new Item("cushion", "Coussin moelleux", "home", 80));

    private PetCatalog() {
    }

    public static Optional<Item> find(String id) {
        return ITEMS.stream().filter(i -> i.id().equals(id)).findFirst();
    }
}
