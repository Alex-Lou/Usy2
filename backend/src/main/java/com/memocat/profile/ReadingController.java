package com.memocat.profile;

import com.memocat.profile.dto.ReadingDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/** The current person's message reading settings (font, size). */
@RestController
@RequestMapping("/api/me/reading")
public class ReadingController {

    private final ReadingService reading;

    public ReadingController(ReadingService reading) {
        this.reading = reading;
    }

    @GetMapping
    public ReadingDto get(Principal principal) {
        return reading.get(principal.getName());
    }

    @PutMapping
    public ReadingDto save(Principal principal, @RequestBody ReadingDto request) {
        return reading.save(principal.getName(), request);
    }
}
