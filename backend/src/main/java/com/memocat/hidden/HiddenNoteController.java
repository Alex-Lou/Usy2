package com.memocat.hidden;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/hidden-notes")
public class HiddenNoteController {

    private final HiddenNoteService service;

    public HiddenNoteController(HiddenNoteService service) {
        this.service = service;
    }

    public record HideRequest(Long assetId, String text) {
    }

    /** The notes behind a photo (the other one's text stays hidden until found). */
    @GetMapping
    public List<HiddenNoteDto> onPhoto(Principal principal, @RequestParam Long assetId) {
        return service.onPhoto(principal.getName(), assetId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HiddenNoteDto hide(Principal principal, @RequestBody HideRequest request) {
        return service.hide(principal.getName(), request.assetId(), request.text());
    }

    @PostMapping("/{id}/find")
    public HiddenNoteDto find(Principal principal, @PathVariable Long id) {
        return service.find(principal.getName(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        service.delete(principal.getName(), id);
    }
}
