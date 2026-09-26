package com.memocat.pet;

import com.memocat.pet.dto.HouseDto;
import com.memocat.pet.dto.HouseRequests;
import com.memocat.pet.dto.PetRequests;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/** 🏡 The house: its decor catalog, the surfaces chosen and what is placed where. */
@RestController
@RequestMapping("/api/pet/house")
public class HouseController {

    private final HouseService house;

    public HouseController(HouseService house) {
        this.house = house;
    }

    @GetMapping
    public HouseDto state() {
        return house.state();
    }

    @PostMapping("/items/{item}/buy")
    public HouseDto buy(Principal principal, @PathVariable String item) {
        return house.buy(principal.getName(), item);
    }

    @PutMapping("/items/{item}/equipped")
    public HouseDto choose(Principal principal, @PathVariable String item, @RequestBody PetRequests.Equip request) {
        return house.choose(principal.getName(), item, request.equipped());
    }

    @PutMapping("/layouts/{scene}")
    public HouseDto saveLayout(Principal principal, @PathVariable String scene, @RequestBody HouseRequests.Layout request) {
        return house.saveLayout(principal.getName(), scene, request);
    }
}
