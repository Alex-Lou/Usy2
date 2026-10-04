package com.memocat.petitbac;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PetitBacRulesTest {

    @Test
    void theLetterIgnoresArticlesAccentsAndCase() {
        assertThat(PetitBacRules.onLetter("La Rochelle", "R")).isTrue();
        assertThat(PetitBacRules.onLetter("l'Inde", "I")).isTrue();
        assertThat(PetitBacRules.onLetter("  Éléphant ", "E")).isTrue();
        assertThat(PetitBacRules.onLetter("Lion", "L")).isTrue();
        assertThat(PetitBacRules.onLetter("Rome", "P")).isFalse();
        assertThat(PetitBacRules.onLetter("", "A")).isFalse();
        assertThat(PetitBacRules.onLetter("   ", "A")).isFalse();
    }

    @Test
    void theSameWordDespiteCaseAccentsAndPlural() {
        assertThat(PetitBacRules.key("Pommes")).isEqualTo(PetitBacRules.key("pomme"));
        assertThat(PetitBacRules.key("Hélène")).isEqualTo(PetitBacRules.key("helene"));
        assertThat(PetitBacRules.key("Le Mans")).isEqualTo(PetitBacRules.key("mans"));
        assertThat(PetitBacRules.key("Bus")).isEqualTo("bus"); // short words keep their s
    }

    @Test
    void answersAreTidiedAndCut() {
        assertThat(PetitBacRules.clean("  Paris   Plage ")).isEqualTo("Paris Plage");
        assertThat(PetitBacRules.clean("x".repeat(60))).hasSize(PetitBacRules.MAX_ANSWER_LENGTH);
        assertThat(PetitBacRules.clean(null)).isEmpty();
    }

    @Test
    void tenAloneFiveTogetherZeroOtherwise() {
        List<String> mine = List.of("Paris", "Pomme", "", "Rome", "Panda");
        List<String> theirs = List.of("Pékin", "pommes", "Poire", "Prague", "Pie");
        assertThat(PetitBacRules.points(mine, theirs, Set.of(), Set.of(), "P")).containsExactly(10, 5, 0, 0, 10);
        assertThat(PetitBacRules.points(theirs, mine, Set.of(), Set.of(), "P")).containsExactly(10, 5, 10, 10, 10);
        // Refused by the other: nothing; my partner then is alone on that one.
        assertThat(PetitBacRules.points(mine, theirs, Set.of(0), Set.of(), "P")).containsExactly(0, 5, 0, 0, 10);
        assertThat(PetitBacRules.points(List.of("Pomme"), List.of("Pomme"), Set.of(), Set.of(0), "P")).containsExactly(10);
    }

    @Test
    void lettersAreNeverTrapsNorRepeated() {
        Set<String> used = new HashSet<>();
        Random random = new Random(1);
        for (int i = 0; i < PetitBacRules.LETTERS.length(); i++) {
            String l = PetitBacRules.draw(used, random);
            assertThat("KQWXYZ").doesNotContain(l);
            assertThat(used.add(l)).isTrue();
        }
        assertThat(PetitBacRules.draw(used, random)).isNotEmpty(); // all played: they come round again
    }

    @Test
    void categoriesAreChecked() {
        assertThat(PetitBacRules.categories(List.of(" Prénom ", "Pays", "Un  surnom tendre"))).containsExactly("Prénom", "Pays", "Un surnom tendre");
        assertThatThrownBy(() -> PetitBacRules.categories(List.of("Pays", "Ville"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PetitBacRules.categories(List.of("Pays", "Ville", "pays"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PetitBacRules.categories(List.of("Pays", "Ville", "x"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PetitBacRules.categories(java.util.stream.IntStream.range(0, 13)
                .mapToObj(i -> "Catégorie " + i).toList())).isInstanceOf(IllegalArgumentException.class);
    }
}
