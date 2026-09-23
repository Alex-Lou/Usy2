package com.memocat.pet;

import com.memocat.pet.dto.PetDto;
import com.memocat.pet.dto.PetRequests;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/** The shared cat: state, interactions (pet / feed / play) and its name. */
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

    @PutMapping("/name")
    public PetDto rename(Principal principal, @RequestBody PetRequests.Name request) {
        return pets.rename(principal.getName(), request.name());
    }
}
