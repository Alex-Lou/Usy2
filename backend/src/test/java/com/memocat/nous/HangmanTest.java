package com.memocat.nous;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HangmanTest {

    @Test
    void accentsAndCaseDontCountAndSeparatorsShowFromTheStart() {
        assertThat(Hangman.fold(" Crème  brûlée ")).isEqualTo("CREME BRULEE");
        assertThat(Hangman.fold("Œuf")).isEqualTo("OEUF");
        assertThat(Hangman.pattern("Pain d’épice", "")).isEqualTo("____ _'_____");
        assertThat(Hangman.pattern("Barbe-à-papa", "AP")).isEqualTo("_A___-A-PAPA");
        assertThat(Hangman.letter("é")).isEqualTo('E');
        assertThat(Hangman.letter("ab")).isEqualTo((char) 0);
        assertThat(Hangman.letter("!")).isEqualTo((char) 0);
    }

    @Test
    void errorsAndFound() {
        assertThat(Hangman.errors("Tarte", "TXAZ")).isEqualTo(2);
        assertThat(Hangman.found("Tarte", "TARE")).isTrue();
        assertThat(Hangman.found("Tarte", "TAR")).isFalse();
    }

    @Test
    void onlyWordsOfTwoToTwentyLettersArePlayable() {
        assertThat(Hangman.playable("Crêpe")).isTrue();
        assertThat(Hangman.playable("Île de Ré")).isTrue();
        assertThat(Hangman.playable("a")).isFalse();
        assertThat(Hangman.playable("R2D2")).isFalse();
        assertThat(Hangman.playable("-ah")).isFalse();
        assertThat(Hangman.playable("anticonstitutionnellement")).isFalse();
        assertThat(Hangman.playable(null)).isFalse();
    }
}
