package com.memocat.challenge;

import com.memocat.challenge.ChallengeDtos.PastWeekDto;
import com.memocat.challenge.ChallengeDtos.WeekDto;
import com.memocat.web.PageResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/challenge")
public class ChallengeController {

    private final ChallengeService challenge;

    public ChallengeController(ChallengeService challenge) {
        this.challenge = challenge;
    }

    public record EntryRequest(Long assetId, String caption) {
    }

    public record JokerRequest(String theme) {
    }

    @GetMapping
    public WeekDto thisWeek(Principal principal) {
        return challenge.thisWeek(principal.getName());
    }

    @PostMapping("/entry")
    public WeekDto post(Principal principal, @RequestBody EntryRequest request) {
        return challenge.post(principal.getName(), request.assetId(), request.caption());
    }

    @PostMapping("/joker")
    public WeekDto joker(Principal principal, @RequestBody JokerRequest request) {
        return challenge.joker(principal.getName(), request.theme());
    }

    @GetMapping("/history")
    public PageResponse<PastWeekDto> history(@RequestParam(defaultValue = "0") int page) {
        return challenge.history(page);
    }
}
