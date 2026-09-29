package com.memocat.export;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.security.Principal;
import java.time.LocalDate;

/**
 * « Tout télécharger » (Mon profil › Pour moi). Logged in, the app asks for a
 * single-use link; the browser then downloads the ZIP from it directly.
 */
@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExportService export;
    private final ExportTokens tokens;

    public ExportController(ExportService export, ExportTokens tokens) {
        this.export = export;
        this.tokens = tokens;
    }

    public record ExportLink(String url) {
    }

    @PostMapping("/link")
    public ExportLink link(Principal principal) {
        return new ExportLink("/api/export/download?token=" + tokens.issue(principal.getName()));
    }

    /** Public route (the token is the key): see SecurityConfig. Streams the ZIP as it is written. */
    @GetMapping("/download")
    public void download(@RequestParam String token, HttpServletResponse response) throws IOException {
        tokens.redeem(token).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lien expiré"));
        response.setContentType("application/zip");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"memocat-souvenirs-" + LocalDate.now() + ".zip\"");
        response.setHeader("Cache-Control", "no-store");
        export.writeZip(response.getOutputStream());
    }
}
