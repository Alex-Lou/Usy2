package com.memocat.nous;

import com.memocat.nous.dto.NousDtos;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

/** 💞 Nous deux: the cards, my answers, guessing the other one, and judging their guesses. */
@RestController
@RequestMapping("/api/nous")
public class NousController {

    private final NousService nous;

    public NousController(NousService nous) {
        this.nous = nous;
    }

    @GetMapping
    public NousDtos.Overview overview(Principal principal) {
        return nous.overview(principal.getName());
    }

    @GetMapping("/cards")
    public List<NousDtos.Card> cards(Principal principal, @RequestParam(required = false) String theme) {
        return nous.cards(principal.getName(), theme);
    }

    @PutMapping("/marks")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void mark(Principal principal, @RequestBody NousDtos.Mark request) {
        nous.mark(principal.getName(), request);
    }

    @GetMapping("/me")
    public List<NousDtos.Mine> mine(Principal principal, @RequestParam(required = false) String theme) {
        return nous.mine(principal.getName(), theme);
    }

    @PutMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void answer(Principal principal, @RequestBody NousDtos.Answer request) {
        nous.answer(principal.getName(), request);
    }

    @DeleteMapping("/me/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forget(Principal principal, @PathVariable String id) {
        nous.forget(principal.getName(), id);
    }

    @GetMapping("/guess")
    public List<NousDtos.ToGuess> toGuess(Principal principal) {
        return nous.toGuess(principal.getName());
    }

    @PostMapping("/guess")
    public NousDtos.Reveal guess(Principal principal, @RequestBody NousDtos.Answer request) {
        return nous.guess(principal.getName(), request);
    }

    @GetMapping("/history")
    public NousDtos.History history(Principal principal) {
        return nous.history(principal.getName());
    }

    @PostMapping("/judge/{id}")
    public NousDtos.Reveal judge(Principal principal, @PathVariable long id, @RequestBody NousDtos.Judge request) {
        return nous.judge(principal.getName(), id, request);
    }
}
