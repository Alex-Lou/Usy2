package com.memocat.quiz;

import com.memocat.quiz.dto.QuizDtos;
import org.springframework.http.HttpStatus;
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

/** The quiz: my map, a run (start, answer), my own "Toi & moi" answers, and the duels ("défis"). */
@RestController
@RequestMapping("/api/quiz")
public class QuizController {

    private final QuizService quiz;
    private final QuizChallengeService challenges;

    public QuizController(QuizService quiz, QuizChallengeService challenges) {
        this.quiz = quiz;
        this.challenges = challenges;
    }

    @GetMapping
    public QuizDtos.Overview overview(Principal principal) {
        return quiz.overview(principal.getName());
    }

    @PostMapping("/runs")
    public QuizDtos.Run start(Principal principal, @RequestBody QuizDtos.Start request) {
        return quiz.start(principal.getName(), request);
    }

    @PostMapping("/runs/{id}/answer")
    public QuizDtos.Answered answer(Principal principal, @PathVariable String id, @RequestBody QuizDtos.Answer request) {
        return quiz.answer(principal.getName(), id, request == null ? -1 : request.choice());
    }

    @GetMapping("/me")
    public List<QuizDtos.SelfItem> mine(Principal principal) {
        return quiz.selfList(principal.getName());
    }

    @PutMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void answerMine(Principal principal, @RequestBody QuizDtos.SelfAnswer request) {
        quiz.selfAnswer(principal.getName(), request);
    }

    /** "Défis": the ones I sent and received, and the win tally. */
    @GetMapping("/challenges")
    public QuizDtos.Challenges challenges(Principal principal) {
        return challenges.list(principal.getName());
    }

    /** Plays my side of a new duel (a level of mine, or theme "mix"); it is sent when I finish. */
    @PostMapping("/challenges")
    public QuizDtos.Run challenge(Principal principal, @RequestBody QuizDtos.Start request) {
        return challenges.create(principal.getName(), request);
    }

    @PostMapping("/challenges/{id}/play")
    public QuizDtos.Run playChallenge(Principal principal, @PathVariable long id) {
        return challenges.play(principal.getName(), id);
    }

    @GetMapping("/challenges/{id}")
    public QuizDtos.Duel duel(Principal principal, @PathVariable long id) {
        return challenges.duel(principal.getName(), id);
    }
}
