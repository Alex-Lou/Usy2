package com.memocat.pet;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * 🏡 Everything the house can be decorated with, from pet/decor.json (the one
 * list; the app draws each id from its own SVG). {@code slot} "decor": an
 * object placed freely, as many times as wanted once bought ({@code cat}
 * sorts the shop). Any other slot is a surface, one at a time: wallpaper,
 * floor, window view, ceiling, the house itself (outside) and its ground.
 */
public final class HouseCatalog {

    public static final String DECOR = "decor";
    public static final Set<String> SURFACES = Set.of("wall", "floor", "view", "ceiling", "house", "ground");

    public record Item(String id, String label, String slot, String cat, int price, String src) {
    }

    public static final List<Item> ITEMS = load();

    private HouseCatalog() {
    }

    public static Optional<Item> find(String id) {
        return ITEMS.stream().filter(i -> i.id().equals(id)).findFirst();
    }

    private static List<Item> load() {
        try (InputStream in = HouseCatalog.class.getResourceAsStream("/pet/decor.json")) {
            if (in == null) {
                throw new IllegalStateException("pet/decor.json missing");
            }
            return List.copyOf(new ObjectMapper().readValue(in, new TypeReference<List<Item>>() { }));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
