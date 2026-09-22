package com.memocat.game;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.domain.Game;
import com.memocat.domain.GameScore;
import com.memocat.domain.User;
import com.memocat.game.dto.GameDto;
import com.memocat.game.dto.GamesStateDto;
import com.memocat.game.dto.ScoreDto;
import com.memocat.repository.GameRepository;
import com.memocat.repository.GameScoreRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ForbiddenException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Real-time game framework (Morpion for now). The server is the sole authority:
 * it validates the turn and the move, computes the result, keeps the score, and
 * broadcasts the new state to both players over STOMP.
 */
@Service
public class GameService {

    public static final String MORPION = "morpion";
    private static final String TOPIC = "/topic/games";

    private final GameRepository gameRepository;
    private final GameScoreRepository scoreRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messaging;

    public GameService(GameRepository gameRepository,
                       GameScoreRepository scoreRepository,
                       UserRepository userRepository,
                       ObjectMapper objectMapper,
                       SimpMessagingTemplate messaging) {
        this.gameRepository = gameRepository;
        this.scoreRepository = scoreRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.messaging = messaging;
    }

    @Transactional(readOnly = true)
    public GamesStateDto currentState(String type) {
        requireType(type);
        Game game = gameRepository.findFirstByTypeAndStatus(type, "active")
                .or(() -> gameRepository.findFirstByTypeOrderByUpdatedAtDesc(type))
                .orElse(null);
        return new GamesStateDto(type, game == null ? null : toDto(game), scores(type));
    }

    @Transactional
    public GamesStateDto start(String username, String type) {
        requireType(type);
        User creator = requireUser(username);
        Game game = gameRepository.findFirstByTypeAndStatus(type, "active")
                .orElseGet(() -> createGame(type, creator));
        GamesStateDto state = state(type, game);
        messaging.convertAndSend(TOPIC, state);
        return state;
    }

    @Transactional
    public GamesStateDto move(String username, String type, int cell, String species) {
        requireType(type);
        User user = requireUser(username);
        Game game = gameRepository.findFirstByTypeAndStatus(type, "active")
                .orElseThrow(() -> new ResourceNotFoundException("No active game"));
        MorpionState st = parse(game);

        if (game.getTurnUser() == null || !game.getTurnUser().getId().equals(user.getId())) {
            throw new ForbiddenException("Ce n'est pas ton tour");
        }
        boolean isX = user.getId().equals(st.getX());
        boolean isO = user.getId().equals(st.getO());
        if (!isX && !isO) {
            throw new ForbiddenException("Tu ne participes pas à cette partie");
        }
        if (cell < 0 || cell >= 9) {
            throw new ContentValidationException("Case invalide");
        }
        if (st.getBoard().get(cell) != null) {
            throw new ContentValidationException("Case déjà occupée");
        }

        st.getBoard().set(cell, isX ? "X" : "O");
        if (species != null && !species.isBlank()) {
            if (isX) {
                st.setXSpecies(species);
            } else {
                st.setOSpecies(species);
            }
        }

        String winnerMark = MorpionLogic.winner(st.getBoard());
        if (winnerMark != null) {
            game.setStatus("finished");
            game.setTurnUser(null);
            game.setWinnerUser(user);
            User loser = userRepository.findById(isX ? st.getO() : st.getX()).orElse(null);
            award(type, user, loser);
        } else if (MorpionLogic.isFull(st.getBoard())) {
            game.setStatus("finished");
            game.setTurnUser(null);
            game.setDraw(true);
            awardDraw(type, st.getX(), st.getO());
        } else {
            Long nextId = isX ? st.getO() : st.getX();
            game.setTurnUser(userRepository.findById(nextId).orElse(null));
        }

        game.setState(write(st));
        gameRepository.save(game);
        GamesStateDto state = state(type, game);
        messaging.convertAndSend(TOPIC, state);
        return state;
    }

    private Game createGame(String type, User creator) {
        User other = otherUser(creator);
        MorpionState st = MorpionState.empty(creator.getId(), other.getId());
        Game game = new Game(type, write(st), creator);
        return gameRepository.save(game);
    }

    private User otherUser(User creator) {
        return userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(creator.getId()))
                .findFirst()
                .orElse(creator);
    }

    private void award(String type, User winner, User loser) {
        score(type, winner).addWin();
        if (loser != null) {
            score(type, loser).addLoss();
        }
    }

    private void awardDraw(String type, Long xId, Long oId) {
        userRepository.findById(xId).ifPresent(u -> score(type, u).addDraw());
        userRepository.findById(oId).ifPresent(u -> score(type, u).addDraw());
    }

    private GameScore score(String type, User user) {
        return scoreRepository.findByTypeAndUserId(type, user.getId())
                .orElseGet(() -> scoreRepository.save(new GameScore(type, user)));
    }

    private List<ScoreDto> scores(String type) {
        return userRepository.findAll().stream()
                .map(u -> {
                    GameScore s = score(type, u);
                    return new ScoreDto(u.getId(), u.getDisplayName(), s.getWins(), s.getDraws(), s.getLosses());
                })
                .toList();
    }

    private GamesStateDto state(String type, Game game) {
        return new GamesStateDto(type, toDto(game), scores(type));
    }

    private GameDto toDto(Game game) {
        MorpionState st = parse(game);
        return new GameDto(
                game.getId(),
                game.getType(),
                game.getStatus(),
                st.getBoard(),
                game.getTurnUser() != null ? game.getTurnUser().getId() : null,
                game.getWinnerUser() != null ? game.getWinnerUser().getId() : null,
                game.isDraw(),
                st.getX(),
                st.getO(),
                st.getXSpecies(),
                st.getOSpecies());
    }

    private void requireType(String type) {
        if (!MORPION.equals(type)) {
            throw new ContentValidationException("Unknown game type: " + type);
        }
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private MorpionState parse(Game game) {
        try {
            return objectMapper.readValue(game.getState(), MorpionState.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to read game state", e);
        }
    }

    private String write(MorpionState st) {
        try {
            return objectMapper.writeValueAsString(st);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize game state", e);
        }
    }
}
