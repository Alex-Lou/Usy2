package com.memocat.game;

import com.memocat.game.dto.MoveRequest;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Receives moves on /app/game.move. The player is taken from the authenticated
 * STOMP session, never from the payload. GameService validates the move and
 * broadcasts the new state to /topic/games itself, so nothing is returned here.
 */
@Controller
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @MessageMapping("/game.move")
    public void move(MoveRequest request, Principal principal) {
        gameService.move(principal.getName(), request.type(), request.cell(), request.species());
    }
}
