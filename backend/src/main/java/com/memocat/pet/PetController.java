package com.memocat.pet;

import com.memocat.pet.dto.PetDto;
import com.memocat.pet.dto.PetRequests;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/** The shared cat: state, care actions, its name and its accessories. */
@RestController
@RequestMapping("/api/pet")
public class PetController {

    private final PetService pets;

    public PetController(PetService pets) {
        this.pets = pets;
    }

    @GetMapping
    public PetDto state() {
        return pets.state();
    }

    @PostMapping("/actions")
    public PetDto act(Principal principal, @RequestBody PetRequests.Action request) {
        return pets.act(principal.getName(), request.action());
    }

    @PostMapping("/items/{item}/buy")
    public PetDto buy(Principal principal, @PathVariable String item) {
        return pets.buy(principal.getName(), item);
    }

    @PutMapping("/items/{item}/equipped")
    public PetDto equip(Principal principal, @PathVariable String item, @RequestBody PetRequests.Equip request) {
        return pets.equip(principal.getName(), item, request.equipped());
    }

    /** End of a mini-game round (e.g. "fish"): the score feeds the cat and earns coins. */
    @PostMapping("/games/{game}/rounds")
    public PetDto playRound(Principal principal, @PathVariable String game, @RequestBody PetRequests.Round request) {
        return pets.playRound(principal.getName(), game, request.score());
    }

    @PutMapping("/name")
    public PetDto rename(Principal principal, @RequestBody PetRequests.Name request) {
        return pets.rename(principal.getName(), request.name());
    }
}
