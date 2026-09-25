package com.memocat.couple;

import com.memocat.couple.dto.AppearanceDto;
import com.memocat.couple.dto.NousThemeDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/**
 * The shared looks, for both: the app's (each person's own choices still win)
 * and the one of "Notre profil".
 */
@RestController
@RequestMapping("/api/couple")
public class AppearanceController {

    private final SharedAppearanceService appearance;
    private final NousThemeService nousTheme;

    public AppearanceController(SharedAppearanceService appearance, NousThemeService nousTheme) {
        this.appearance = appearance;
        this.nousTheme = nousTheme;
    }

    @GetMapping("/appearance")
    public AppearanceDto get() {
        return appearance.get();
    }

    @PutMapping("/appearance")
    public AppearanceDto save(Principal principal, @RequestBody AppearanceDto request) {
        return appearance.save(principal.getName(), request);
    }

    @GetMapping("/nous-theme")
    public NousThemeDto nousTheme() {
        return nousTheme.get();
    }

    @PutMapping("/nous-theme")
    public NousThemeDto saveNousTheme(Principal principal, @RequestBody NousThemeDto request) {
        return nousTheme.save(principal.getName(), request);
    }
}
