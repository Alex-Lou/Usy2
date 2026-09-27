package com.memocat.naval;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/** 🚢 Battleship: each call answers with the caller's own view of the game. */
@RestController
@RequestMapping("/api/naval")
public class NavalController {

    private final NavalService naval;

    public NavalController(NavalService naval) {
        this.naval = naval;
    }

    @GetMapping("/current")
    public ResponseEntity<NavalDtos.View> current(Principal principal) {
        return naval.current(principal.getName()).map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }

    @PostMapping
    public NavalDtos.View create(Principal principal, @RequestBody(required = false) NavalDtos.Create request) {
        return naval.create(principal.getName(), request);
    }

    @PostMapping("/{id}/fleet")
    public NavalDtos.View place(Principal principal, @PathVariable long id, @RequestBody NavalDtos.Fleet request) {
        return naval.place(principal.getName(), id, request);
    }

    @PostMapping("/{id}/shoot")
    public NavalDtos.View shoot(Principal principal, @PathVariable long id, @RequestBody NavalDtos.Shoot request) {
        return naval.shoot(principal.getName(), id, request);
    }

    @PostMapping("/{id}/quit")
    public NavalDtos.View quit(Principal principal, @PathVariable long id) {
        return naval.quit(principal.getName(), id);
    }

    @PostMapping("/{id}/theme")
    public NavalDtos.View theme(Principal principal, @PathVariable long id, @RequestBody NavalDtos.Theme request) {
        return naval.chooseTheme(principal.getName(), id, request);
    }
}
