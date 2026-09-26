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
        assertThat(bank.question("film")).hasValueSatisfying(q -> assertThat(q.options()).startsWith("Comédie", "Horreur", "Science-fiction", "Romance").hasSize(12));
        assertThat(bank.question("futur")).isPresent();
    }

    @Test
    void choicesHaveTwoToTwelveOptionsAndNoQuestionIsAskedTwice() {
        Set<String> seen = new HashSet<>();
        bank.all().forEach(q -> {
            assertThat(seen.add(q.text().toLowerCase())).as(q.text()).isTrue();
            if (NousBank.CHOICE.equals(q.kind())) {
                assertThat(q.options()).as(q.id()).hasSizeBetween(2, NousBank.MAX_OPTIONS);
            } else {
                assertThat(q.options()).isEmpty();
            }
        });
    }
}
