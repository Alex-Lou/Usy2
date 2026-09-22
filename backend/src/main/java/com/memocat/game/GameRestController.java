package com.memocat.game;

import com.memocat.game.dto.GamesStateDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/games")
public class GameRestController {

    private final GameService gameService;

    public GameRestController(GameService gameService) {
        this.gameService = gameService;
    }

    @GetMapping("/{type}")
    public GamesStateDto current(@PathVariable String type) {
        return gameService.currentState(type);
    }

    @PostMapping("/{type}/start")
    public GamesStateDto start(@PathVariable String type, Principal principal) {
        return gameService.start(principal.getName(), type);
    }
}
