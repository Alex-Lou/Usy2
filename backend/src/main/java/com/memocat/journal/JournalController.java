package com.memocat.journal;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/journal")
public class JournalController {

    private final JournalService journal;

    public JournalController(JournalService journal) {
        this.journal = journal;
    }

    public record WriteRequest(LocalDate day, String text) {
    }

    /** A month's lines ({@code month} 1-12), or the whole year's without it (the "book"). */
    @GetMapping
    public JournalService.Page lines(@RequestParam int year, @RequestParam(required = false) Integer month) {
        return journal.lines(year, month);
    }

    @GetMapping("/years")
    public List<Integer> years() {
        return journal.years();
    }

    /** My line of today (or {@code day}: yesterday); an empty text erases it (204). */
    @PutMapping
    public ResponseEntity<JournalEntryDto> write(Principal principal, @RequestBody WriteRequest request) {
        return journal.write(principal.getName(), request.day(), request.text())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
