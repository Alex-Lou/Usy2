package com.memocat.pet;

import java.util.List;
import java.util.Optional;

/**
 * The accessories on sale. One item per slot can be worn at a time
 * (neck, head, face), one cushion in the house, and one coat (Moka's fur
 * colours; none: Moka's own cream).
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
            new Item("cushion", "Coussin moelleux", "home", 80),
            new Item("bandana", "Bandana", "neck", 35),
            new Item("pearls", "Collier de perles", "neck", 90),
            new Item("sunglasses", "Lunettes de soleil", "face", 55),
            new Item("heartglasses", "Lunettes cœurs", "face", 70),
            new Item("monocle", "Monocle", "face", 85),
            new Item("flowers", "Couronne de fleurs", "head", 65),
            new Item("party", "Chapeau de fête", "head", 40),
            new Item("bunny", "Serre-tête lapin", "head", 50),
            new Item("wizard", "Chapeau de magicien", "head", 110),
            new Item("tophat", "Haut-de-forme", "head", 100),
            // Drawn from the free emoji sets, like the house decor (see the app's pet/wear/).
            new Item("gradcap", "Toque de diplôme", "head", 90),
            new Item("casquette", "Casquette", "head", 45),
            new Item("capeline", "Capeline", "head", 70),
            new Item("couronne-or", "Couronne royale", "head", 180),
            new Item("gibus", "Haut-de-forme de gala", "head", 130),
            new Item("hibiscus", "Fleur à l'oreille", "head", 35),
            new Item("noeud-tete", "Nœud dans les poils", "head", 40),
            new Item("lunettes-rondes", "Lunettes bleues", "face", 60),
            new Item("lunettes-noires", "Lunettes de star", "face", 75),
            new Item("masque-ski", "Masque de ski", "face", 65),
            new Item("cravate", "Cravate", "neck", 55),
            new Item("echarpe-laine", "Écharpe en laine", "neck", 60),
            new Item("medaille", "Médaille d'or", "neck", 120),
            new Item("clochette", "Clochette", "neck", 30),
            new Item("noeud-rouge", "Grand nœud rouge", "neck", 45),
            new Item("perles-bois", "Collier de perles en bois", "neck", 50),
            // Coats: one at a time, Moka's own colours when none is worn.
            new Item("pelage-roux", "Pelage roux", "coat", 120),
            new Item("pelage-noir", "Pelage noir", "coat", 120),
            new Item("pelage-gris", "Pelage gris perle", "coat", 120),
            new Item("pelage-choco", "Pelage chocolat", "coat", 140),
            new Item("pelage-creme", "Pelage crème et moka", "coat", 150),
            new Item("pelage-neige", "Pelage blanc neige", "coat", 150),
            new Item("pelage-lavande", "Pelage lavande", "coat", 200));

    private PetCatalog() {
    }

    public static Optional<Item> find(String id) {
        return ITEMS.stream().filter(i -> i.id().equals(id)).findFirst();
    }
}
