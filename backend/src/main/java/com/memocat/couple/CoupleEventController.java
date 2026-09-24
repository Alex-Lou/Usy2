package com.memocat.couple;

import com.memocat.couple.dto.CoupleEventDto;
import com.memocat.couple.dto.CoupleRequests;
import org.springframework.http.HttpStatus;
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

/** The shared calendar ("Nos dates"). */
@RestController
@RequestMapping("/api/couple/events")
public class CoupleEventController {

    private final CoupleEventService events;

    public CoupleEventController(CoupleEventService events) {
        this.events = events;
    }

    @GetMapping
    public List<CoupleEventDto> all() {
        return events.all();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CoupleEventDto create(Principal principal, @RequestBody CoupleRequests.EventRequest request) {
        return events.create(principal.getName(), request);
    }

    @PutMapping("/{id}")
    public CoupleEventDto update(Principal principal, @PathVariable Long id,
                                 @RequestBody CoupleRequests.EventRequest request) {
        return events.update(principal.getName(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        events.delete(principal.getName(), id);
    }
}
