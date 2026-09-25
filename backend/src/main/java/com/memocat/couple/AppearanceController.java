package com.memocat.couple;

import com.memocat.couple.dto.AppearanceDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/** The shared look of the app, for both (each person's own choices still win). */
@RestController
@RequestMapping("/api/couple/appearance")
public class AppearanceController {

    private final SharedAppearanceService appearance;

    public AppearanceController(SharedAppearanceService appearance) {
        this.appearance = appearance;
    }

    @GetMapping
    public AppearanceDto get() {
        return appearance.get();
    }

    @PutMapping
    public AppearanceDto save(Principal principal, @RequestBody AppearanceDto request) {
        return appearance.save(principal.getName(), request);
    }
}
