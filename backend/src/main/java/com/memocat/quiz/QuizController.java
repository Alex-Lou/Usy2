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

/** The quiz: my map, a run (start, answer), and my own "Toi & moi" answers. */
@RestController
@RequestMapping("/api/quiz")
public class QuizController {

    private final QuizService quiz;

    public QuizController(QuizService quiz) {
        this.quiz = quiz;
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
}
