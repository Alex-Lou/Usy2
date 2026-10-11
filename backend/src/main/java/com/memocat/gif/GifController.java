package com.memocat.gif;

import com.memocat.asset.dto.AssetDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;

/** The GIF search (see GifService): is it on, trending or matching GIFs, and keeping the one picked. */
@RestController
@RequestMapping("/api/gifs")
public class GifController {

    private final GifService gifs;

    public GifController(GifService gifs) {
        this.gifs = gifs;
    }

    @GetMapping("/status")
    public Map<String, Boolean> status() {
        return Map.of("enabled", gifs.enabled());
    }

    @GetMapping
    public GifService.GifPage find(@RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "0") int offset) {
        return gifs.find(q, offset);
    }

    @PostMapping("/{id}")
    public AssetDto save(Principal principal, @PathVariable String id) {
        return gifs.save(principal.getName(), id);
    }
}
