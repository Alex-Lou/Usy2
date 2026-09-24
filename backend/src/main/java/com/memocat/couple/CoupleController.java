package com.memocat.couple;

import com.memocat.couple.dto.CoupleDto;
import com.memocat.couple.dto.CoupleRequests;
import com.memocat.couple.dto.MemoryDto;
import com.memocat.couple.dto.MoodDto;
import com.memocat.couple.dto.NoteDto;
import com.memocat.couple.dto.SharedWidgetsDto;
import com.memocat.web.PageResponse;
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

/** The shared "Nous" space (both members see and edit the same data). */
@RestController
@RequestMapping("/api/couple")
public class CoupleController {

    private final CoupleService coupleService;
    private final MemoryService memoryService;
    private final SharedWidgetsService sharedWidgets;

    public CoupleController(CoupleService coupleService, MemoryService memoryService,
                            SharedWidgetsService sharedWidgets) {
        this.coupleService = coupleService;
        this.memoryService = memoryService;
        this.sharedWidgets = sharedWidgets;
    }

    @GetMapping
    public CoupleDto overview() {
        return coupleService.overview();
    }

    @PutMapping("/mood")
    public MoodDto setMood(Principal principal, @RequestBody CoupleRequests.MoodRequest request) {
        return coupleService.setMood(principal.getName(), request.emoji(), request.label());
    }

    @PutMapping("/together-since")
    public CoupleDto setTogetherSince(Principal principal,
                                      @RequestBody CoupleRequests.TogetherSinceRequest request) {
        coupleService.setTogetherSince(principal.getName(), request.date());
        return coupleService.overview();
    }

    @GetMapping("/notes")
    public PageResponse<NoteDto> notes(@RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        return coupleService.listNotes(page, size);
    }

    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    public NoteDto addNote(Principal principal, @RequestBody CoupleRequests.TextRequest request) {
        return coupleService.addNote(principal.getName(), request.text());
    }

    @DeleteMapping("/notes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNote(Principal principal, @PathVariable Long id) {
        coupleService.deleteNote(principal.getName(), id);
    }

    @GetMapping("/memories")
    public List<MemoryDto> memories() {
        return memoryService.onThisDay();
    }

    /** The widgets of both side menus (editable by both). */
    @GetMapping("/widgets")
    public SharedWidgetsDto widgets() {
        return sharedWidgets.get();
    }

    @PutMapping("/widgets")
    public SharedWidgetsDto saveWidgets(Principal principal, @RequestBody CoupleRequests.WidgetsRequest request) {
        return sharedWidgets.save(principal.getName(), request.widgets(), request.version());
    }

    @PostMapping("/widgets")
    public SharedWidgetsDto addWidget(Principal principal, @RequestBody CoupleRequests.AddWidgetRequest request) {
        return sharedWidgets.add(principal.getName(), request.widget());
    }
}
