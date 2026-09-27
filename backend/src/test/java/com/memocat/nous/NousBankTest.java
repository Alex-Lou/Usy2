package com.memocat.nous;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class NousBankTest {

    private final NousBank bank = new NousBank();

    @Test
    void everyQuestionIsReadAndNoneIsSkipped() {
        assertThat(bank.all()).hasSize(504);
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
    void everyThemeHasEveryNewFormat() {
        for (NousBank.Theme t : NousBank.THEMES) {
            Set<String> kinds = new HashSet<>();
            bank.all().stream().filter(q -> q.theme().equals(t.id())).forEach(q -> kinds.add(q.kind()));
            assertThat(kinds).as(t.id()).contains(NousBank.ONE, NousBank.SCALE, NousBank.RANK, NousBank.HANGMAN, NousBank.SHORT, NousBank.FILL);
        }
        assertThat(bank.all()).filteredOn(q -> NousBank.FILL.equals(q.kind())).allSatisfy(q -> assertThat(q.text()).contains(NousBank.BLANK));
        assertThat(bank.all()).filteredOn(q -> NousBank.SCALE.equals(q.kind())).allSatisfy(q -> assertThat(q.options()).hasSize(2));
    }

    @Test
    void eachKindHasItsOptionsAndNoQuestionIsAskedTwice() {
        Set<String> seen = new HashSet<>();
        bank.all().forEach(q -> {
            assertThat(seen.add(q.text().toLowerCase())).as(q.text()).isTrue();
            switch (q.kind()) {
                case NousBank.CHOICE -> assertThat(q.options()).as(q.id()).hasSizeBetween(2, NousBank.MAX_OPTIONS);
                case NousBank.ONE -> assertThat(q.options()).as(q.id()).hasSizeBetween(2, 4);
                case NousBank.SCALE -> assertThat(q.options()).as(q.id()).hasSize(2);
                case NousBank.RANK -> assertThat(q.options()).as(q.id()).hasSizeBetween(3, 5);
                default -> assertThat(q.options()).as(q.id()).isEmpty();
            }
        });
    }
}
