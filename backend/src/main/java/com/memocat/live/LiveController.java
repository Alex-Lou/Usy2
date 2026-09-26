package com.memocat.live;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/** ⚡ Live games: the current one, invite, accept or decline, answer, pick up after a pause, nudge, quit. */
@RestController
@RequestMapping("/api/live")
public class LiveController {

    private final LiveService live;

    public LiveController(LiveService live) {
        this.live = live;
    }

    /** The game going on (or the last one); 204 when there has never been one. */
    @GetMapping("/current")
    public ResponseEntity<LiveDtos.View> current(Principal principal) {
        return live.current(principal.getName()).map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}")
    public LiveDtos.View get(Principal principal, @PathVariable long id) {
        return live.get(principal.getName(), id);
    }

    @PostMapping
    public LiveDtos.View create(Principal principal, @RequestBody LiveDtos.Create request) {
        return live.create(principal.getName(), request);
    }

    @PostMapping("/{id}/accept")
    public LiveDtos.View accept(Principal principal, @PathVariable long id) {
        return live.accept(principal.getName(), id);
    }

    @PostMapping("/{id}/decline")
    public LiveDtos.View decline(Principal principal, @PathVariable long id) {
        return live.decline(principal.getName(), id);
    }

    @PostMapping("/{id}/answer")
    public LiveDtos.View answer(Principal principal, @PathVariable long id, @RequestBody LiveDtos.Answer request) {
        return live.answer(principal.getName(), id, request);
    }

    @PostMapping("/{id}/resume")
    public LiveDtos.View resume(Principal principal, @PathVariable long id) {
        return live.resume(principal.getName(), id);
    }

    @PostMapping("/{id}/nudge")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void nudge(Principal principal, @PathVariable long id) {
        live.nudge(principal.getName(), id);
    }

    @PostMapping("/{id}/quit")
    public LiveDtos.View quit(Principal principal, @PathVariable long id) {
        return live.quit(principal.getName(), id);
    }
}
