package com.memocat.profile;

import com.memocat.profile.dto.ColorModeDto;
import com.memocat.profile.dto.ReadingDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/** The current person's own settings: message reading (font, size) and light/dark look. */
@RestController
@RequestMapping("/api/me")
public class ReadingController {

    private final ReadingService reading;

    public ReadingController(ReadingService reading) {
        this.reading = reading;
    }

    @GetMapping("/reading")
    public ReadingDto get(Principal principal) {
        return reading.get(principal.getName());
    }

    @PutMapping("/reading")
    public ReadingDto save(Principal principal, @RequestBody ReadingDto request) {
        return reading.save(principal.getName(), request);
    }

    /** Light/dark look, the same on all of this person's devices. */
    @GetMapping("/color-mode")
    public ColorModeDto colorMode(Principal principal) {
        return reading.colorMode(principal.getName());
    }

    @PutMapping("/color-mode")
    public ColorModeDto saveColorMode(Principal principal, @RequestBody ColorModeDto request) {
        return reading.saveColorMode(principal.getName(), request);
    }
}
