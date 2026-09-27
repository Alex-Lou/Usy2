package com.memocat.pet.dto;

import java.util.List;
import java.util.Map;

/**
 * The house as clients see it: the shared purse, the whole decor catalog
 * with what is owned (and, for surfaces, chosen), and the objects placed in
 * each scene ("inside", "outside") with the version to send back on save.
 */
public record HouseDto(int coins, List<HouseItemDto> items, Map<String, LayoutDto> layouts) {

    public record HouseItemDto(String id, String label, String slot, String cat, int price, boolean owned, boolean equipped) {
    }

    public record LayoutDto(int version, List<Placed> items) {
    }

    /**
     * One object in a scene: its catalog id, its centre (x, y: 0..1 of the
     * scene), its scale (1 = its natural size), its turn in degrees and
     * whether it is mirrored. Later ones are drawn over earlier ones.
     */
    public record Placed(String item, double x, double y, double s, double r, boolean f) {
    }
}
