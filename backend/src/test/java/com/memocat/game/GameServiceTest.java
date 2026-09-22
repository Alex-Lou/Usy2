package com.memocat.game;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memocat.domain.Game;
import com.memocat.domain.GameScore;
import com.memocat.domain.User;
import com.memocat.game.dto.GamesStateDto;
import com.memocat.repository.GameRepository;
import com.memocat.repository.GameScoreRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ForbiddenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GameServiceTest {

    @Mock private GameRepository gameRepository;
    @Mock private GameScoreRepository scoreRepository;
    @Mock private UserRepository userRepository;
    @Mock private SimpMessagingTemplate messaging;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private GameService service;
    private User lou;   // X, id 1, turn first
    private User mia;   // O, id 2

    @BeforeEach
    void setUp() {
        service = new GameService(gameRepository, scoreRepository, userRepository, objectMapper, messaging);
        lou = user(1L, "lou", "Lou");
        mia = user(2L, "mia", "Mia");
        when(userRepository.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(userRepository.findByUsername("mia")).thenReturn(Optional.of(mia));
        when(userRepository.findById(1L)).thenReturn(Optional.of(lou));
        when(userRepository.findById(2L)).thenReturn(Optional.of(mia));
        when(userRepository.findAll()).thenReturn(List.of(lou, mia));
        // Stateful score store: save() keeps the instance, findByTypeAndUserId() returns it,
        // mirroring the real repository so awarded points survive across score() lookups.
        Map<Long, GameScore> scores = new HashMap<>();
        when(scoreRepository.findByTypeAndUserId(eq("morpion"), any()))
                .thenAnswer(inv -> Optional.ofNullable(scores.get(inv.<Long>getArgument(1))));
        when(scoreRepository.save(any(GameScore.class))).thenAnswer(inv -> {
            GameScore s = inv.getArgument(0);
            scores.put(s.getUser().getId(), s);
            return s;
        });
        when(gameRepository.save(any(Game.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private User user(Long id, String username, String display) {
        User u = new User(username, "hash", display);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    /** Active game with the given board string ('X','O','.'), turn = turnUser. */
    private Game activeGame(String cells, User turnUser) {
        MorpionState st = MorpionState.empty(1L, 2L);
        for (int i = 0; i < 9; i++) {
            char c = cells.charAt(i);
            st.getBoard().set(i, c == '.' ? null : String.valueOf(c));
        }
        Game game = new Game("morpion", write(st), turnUser);
        when(gameRepository.findFirstByTypeAndStatus("morpion", "active"))
                .thenReturn(Optional.of(game));
        return game;
    }

    private String write(MorpionState st) {
        try {
            return objectMapper.writeValueAsString(st);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void movePlacesMarkAndTogglesTurn() {
        Game game = activeGame(".........", lou);

        GamesStateDto state = service.move("lou", "morpion", 4, "chat");

        assertThat(state.game().board().get(4)).isEqualTo("X");
        assertThat(state.game().turnUserId()).isEqualTo(2L); // now Mia's turn
        assertThat(state.game().status()).isEqualTo("active");
        assertThat(state.game().xSpecies()).isEqualTo("chat");
        verify(gameRepository).save(game);
        verify(messaging).convertAndSend(eq("/topic/games"), any(GamesStateDto.class));
    }

    @Test
    void moveRejectedWhenNotYourTurn() {
        activeGame(".........", lou); // Lou's turn

        assertThatThrownBy(() -> service.move("mia", "morpion", 0, "loup"))
                .isInstanceOf(ForbiddenException.class);
        verify(gameRepository, never()).save(any());
        verify(messaging, never()).convertAndSend(any(String.class), any(Object.class));
    }

    @Test
    void moveRejectedOnOccupiedCell() {
        activeGame("X........", lou);

        assertThatThrownBy(() -> service.move("lou", "morpion", 0, "chat"))
                .isInstanceOf(com.memocat.web.ContentValidationException.class);
        verify(gameRepository, never()).save(any());
    }

    @Test
    void winningMoveFinishesGameAndScores() {
        // X on 0,1; Lou to play 2 -> top row win
        Game game = activeGame("XX.......", lou);

        GamesStateDto state = service.move("lou", "morpion", 2, "chat");

        assertThat(state.game().status()).isEqualTo("finished");
        assertThat(state.game().winnerUserId()).isEqualTo(1L);
        assertThat(state.game().turnUserId()).isNull();
        // Lou has 1 win, Mia has 1 loss
        assertThat(scoreOf(state, 1L).wins()).isEqualTo(1);
        assertThat(scoreOf(state, 2L).losses()).isEqualTo(1);
    }

    @Test
    void fullBoardWithoutLineIsDraw() {
        // X O X / X X O / O X O  -> full, no winning line; O(Mia) plays last cell 8
        // pre-fill everything except cell 8, turn = Mia (O)
        Game game = activeGame("XOXXXOOX.", mia);

        GamesStateDto state = service.move("mia", "morpion", 8, "loup");

        assertThat(state.game().status()).isEqualTo("finished");
        assertThat(state.game().draw()).isTrue();
        assertThat(state.game().winnerUserId()).isNull();
        assertThat(scoreOf(state, 1L).draws()).isEqualTo(1);
        assertThat(scoreOf(state, 2L).draws()).isEqualTo(1);
    }

    private com.memocat.game.dto.ScoreDto scoreOf(GamesStateDto state, long userId) {
        return state.scores().stream()
                .filter(s -> s.userId() == userId)
                .findFirst()
                .orElseThrow();
    }
}
