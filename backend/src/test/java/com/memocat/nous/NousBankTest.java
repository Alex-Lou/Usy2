package com.memocat.nous;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class NousBankTest {

    private final NousBank bank = new NousBank();

    @Test
    void everyQuestionIsReadAndNoneIsSkipped() {
        assertThat(bank.all()).hasSize(222);
        for (NousBank.Theme t : NousBank.THEMES) {
            assertThat(bank.all()).as(t.id()).anySatisfy(q -> assertThat(q.theme()).isEqualTo(t.id()));
        }
    }

    @Test
    void theOldToiEtMoiAnswersStillPointAtTheirQuestions() {
        assertThat(bank.question("saison")).hasValueSatisfying(q -> {
            assertThat(q.kind()).isEqualTo(NousBank.CHOICE);
            assertThat(q.options()).containsExactly("Printemps", "Été", "Automne", "Hiver");
        });
        assertThat(bank.question("futur")).isPresent();
    }

    @Test
    void choicesHaveFourOptionsAndNoQuestionIsAskedTwice() {
        Set<String> seen = new HashSet<>();
        bank.all().forEach(q -> {
            assertThat(seen.add(q.text().toLowerCase())).as(q.text()).isTrue();
            assertThat(q.options()).hasSize(NousBank.CHOICE.equals(q.kind()) ? 4 : 0);
        });
    }
}
