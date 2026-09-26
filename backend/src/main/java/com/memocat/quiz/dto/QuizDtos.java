package com.memocat.quiz.dto;

import java.util.List;

/** What the quiz API sends: never a right answer before it has been answered. */
public final class QuizDtos {

    private QuizDtos() {
    }

    public record Level(int level, int stars, int best, boolean unlocked) {
    }

    public record Theme(String id, String label, String emoji, String color, List<Level> levels) {
    }

    /** "Toi & moi": how many of the questions each one answered about themself, and my best guess run. */
    public record Toi(int total, int mine, int partnerAnswered, String partnerName, int stars, int best) {
    }

    public record Overview(List<Theme> themes, Toi toi) {
    }

    /** {@code about}: the partner's name when I guess about them ("Toi & moi"). */
    public record Question(int index, int total, String text, List<String> options, int seconds, String about) {
    }

    public record Run(String id, String theme, int level, Question question) {
    }

    public record Result(int score, int correct, int total, int stars, int best, boolean newBest, boolean unlockedNext) {
    }

    /** After an answer: was it right, which was right, and the next question or the end. */
    public record Answered(boolean correct, int correctIndex, int gained, int score, int streak, Question next, Result result) {
    }

    public record SelfItem(String id, String text, List<String> options, Integer choice) {
    }

    public record Start(String theme, Integer level) {
    }

    public record Answer(int choice) {
    }

    public record SelfAnswer(String id, int choice) {
    }
}
