package com.memocat.quiz;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** The bank as shipped: every theme has 10 questions per level, none skipped, none repeated. */
class QuizBankTest {

    private final QuizBank bank = new QuizBank();

    @Test
    void everyLevelOfEveryThemeHasItsTenQuestions() {
        for (QuizBank.Theme t : QuizBank.THEMES) {
            for (int level = 1; level <= QuizBank.LEVELS; level++) {
                assertThat(bank.level(t.id(), level)).as(t.id() + " niveau " + level).hasSize(QuizService.PER_RUN);
            }
        }
    }

    @Test
    void noQuestionIsAskedTwice() {
        Set<String> seen = new HashSet<>();
        for (QuizBank.Theme t : QuizBank.THEMES) {
            for (int level = 1; level <= QuizBank.LEVELS; level++) {
                bank.level(t.id(), level).forEach(q -> assertThat(seen.add(q.text().toLowerCase())).as(q.text()).isTrue());
            }
        }
    }

    @Test
    void toiEtMoiHasItsQuestions() {
        assertThat(bank.self()).hasSize(40);
        assertThat(bank.self()).allSatisfy(q -> assertThat(q.options()).hasSize(4));
    }
}
