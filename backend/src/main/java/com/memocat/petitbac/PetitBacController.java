package com.memocat.petitbac;

import com.memocat.petitbac.PetitBacDtos.AnswersRequest;
import com.memocat.petitbac.PetitBacDtos.CreateRequest;
import com.memocat.petitbac.PetitBacDtos.GameDto;
import com.memocat.petitbac.PetitBacDtos.PingDto;
import com.memocat.petitbac.PetitBacDtos.ReviewRequest;
import com.memocat.petitbac.PetitBacDtos.SummaryDto;
import com.memocat.repository.UserRepository;
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

/**
 * 🎲 Petit Bac. Every change is followed by a ping on /topic/petit-bac: the other screen reloads
 * the game (it only ever shows what the server says).
 */
@RestController
@RequestMapping("/api/petit-bac")
public class PetitBacController {

    static final String TOPIC = "/topic/petit-bac";

    private final PetitBacService petitBac;
    private final SimpMessagingTemplate messaging;
    private final UserRepository users;

    public PetitBacController(PetitBacService petitBac, SimpMessagingTemplate messaging, UserRepository users) {
        this.petitBac = petitBac;
        this.messaging = messaging;
        this.users = users;
    }

    @GetMapping
    public List<SummaryDto> list(Principal principal) {
        return petitBac.list(principal.getName());
    }

    /** A new game and its first round: {@code mode} direct or rythme, 3 to 12 categories. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GameDto create(Principal principal, @RequestBody CreateRequest request) {
        return ping(principal, petitBac.create(principal.getName(), request.mode(), request.categories()));
    }

    @GetMapping("/{id}")
    public GameDto get(Principal principal, @PathVariable Long id) {
        return petitBac.get(principal.getName(), id);
    }

    @PostMapping("/{id}/rounds")
    public GameDto nextRound(Principal principal, @PathVariable Long id) {
        return ping(principal, petitBac.nextRound(principal.getName(), id));
    }

    @PostMapping("/{id}/rounds/{number}/ready")
    public GameDto ready(Principal principal, @PathVariable Long id, @PathVariable int number) {
        return ping(principal, petitBac.ready(principal.getName(), id, number));
    }

    @PutMapping("/{id}/rounds/{number}/answers")
    public GameDto answers(Principal principal, @PathVariable Long id, @PathVariable int number, @RequestBody AnswersRequest request) {
        return ping(principal, petitBac.answers(principal.getName(), id, number, request.answers()));
    }

    /** « Stop ! » / « J'ai fini », with the last answers (optional). */
    @PostMapping("/{id}/rounds/{number}/done")
    public GameDto done(Principal principal, @PathVariable Long id, @PathVariable int number,
                        @RequestBody(required = false) AnswersRequest request) {
        return ping(principal, petitBac.done(principal.getName(), id, number, request == null ? null : request.answers()));
    }

    @PutMapping("/{id}/rounds/{number}/review")
    public GameDto review(Principal principal, @PathVariable Long id, @PathVariable int number, @RequestBody ReviewRequest request) {
        return ping(principal, petitBac.review(principal.getName(), id, number, request.refused(), request.validate()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        petitBac.delete(principal.getName(), id);
    }

    /** The service committed: tell the other screen to reload. */
    private GameDto ping(Principal principal, GameDto game) {
        Long by = users.findByUsername(principal.getName()).map(u -> u.getId()).orElse(null);
        messaging.convertAndSend(TOPIC, new PingDto(game.id(), by));
        return game;
    }
}
