package com.memocat.crossword;

import com.memocat.crossword.CrosswordDtos.CreateRequest;
import com.memocat.crossword.CrosswordDtos.GameDto;
import com.memocat.crossword.CrosswordDtos.PingDto;
import com.memocat.crossword.CrosswordDtos.PlayRequest;
import com.memocat.crossword.CrosswordDtos.SummaryDto;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/crossword")
public class CrosswordController {

    static final String TOPIC = "/topic/crossword";

    private final CrosswordService crosswords;
    private final SimpMessagingTemplate messaging;

    public CrosswordController(CrosswordService crosswords, SimpMessagingTemplate messaging) {
        this.crosswords = crosswords;
        this.messaging = messaging;
    }

    @GetMapping
    public List<SummaryDto> list(Principal principal) {
        return crosswords.list(principal.getName());
    }

    /** A new grid: {@code size} petite, moyenne or grande; {@code shared}: played together. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GameDto create(Principal principal, @RequestBody CreateRequest request) {
        return crosswords.create(principal.getName(), request.size(), request.shared());
    }

    @GetMapping("/{id}")
    public GameDto get(Principal principal, @PathVariable Long id) {
        return crosswords.get(principal.getName(), id);
    }

    /** Letters typed (or revealed); in a shared grid the other one sees them live. */
    @PutMapping("/{id}/cells")
    public PingDto play(Principal principal, @PathVariable Long id, @RequestBody PlayRequest request) {
        PingDto ping = crosswords.play(principal.getName(), id, request.changes());
        if (ping.shared() && !ping.cells().isEmpty()) messaging.convertAndSend(TOPIC, ping);
        return ping;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        crosswords.delete(principal.getName(), id);
    }
}
