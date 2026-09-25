package com.memocat.couple;

import com.memocat.couple.dto.CoupleRequests;
import com.memocat.couple.dto.SharedListDto;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

/** Shared lists. Every change returns the whole updated list. */
@RestController
@RequestMapping("/api/couple")
public class SharedListController {

    private final SharedListService lists;

    public SharedListController(SharedListService lists) {
        this.lists = lists;
    }

    @GetMapping("/lists")
    public List<SharedListDto> all() {
        return lists.all();
    }

    @PostMapping("/lists")
    @ResponseStatus(HttpStatus.CREATED)
    public SharedListDto create(Principal principal, @RequestBody CoupleRequests.NameRequest request) {
        return lists.create(principal.getName(), request.name());
    }

    @PatchMapping("/lists/{id}")
    public SharedListDto rename(Principal principal, @PathVariable Long id,
                                @RequestBody CoupleRequests.NameRequest request) {
        return lists.rename(principal.getName(), id, request.name());
    }

    @DeleteMapping("/lists/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        lists.delete(principal.getName(), id);
    }

    @PostMapping("/lists/{id}/items")
    public SharedListDto addItem(Principal principal, @PathVariable Long id,
                                 @RequestBody CoupleRequests.TextRequest request) {
        return lists.addItem(principal.getName(), id, request.text());
    }

    @DeleteMapping("/lists/{id}/done-items")
    public SharedListDto clearDone(Principal principal, @PathVariable Long id) {
        return lists.clearDone(principal.getName(), id);
    }

    @PatchMapping("/list-items/{id}")
    public SharedListDto setDone(Principal principal, @PathVariable Long id,
                                 @RequestBody CoupleRequests.DoneRequest request) {
        return lists.setDone(principal.getName(), id, request.done());
    }

    @DeleteMapping("/list-items/{id}")
    public SharedListDto deleteItem(Principal principal, @PathVariable Long id) {
        return lists.deleteItem(principal.getName(), id);
    }
}
