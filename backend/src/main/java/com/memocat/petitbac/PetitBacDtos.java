package com.memocat.petitbac;

import java.time.Instant;
import java.util.List;

public final class PetitBacDtos {

    private PetitBacDtos() {
    }

    /** {@code mode}: direct (together, « Stop ! ») or rythme (each at one's own pace). */
    public record CreateRequest(String mode, List<String> categories) {
    }

    /** One answer per category, in their order (empty when nothing found). */
    public record AnswersRequest(List<String> answers) {
    }

    /** {@code refused}: the numbers of the other's answers I don't accept; {@code validate}: I'm done checking. */
    public record ReviewRequest(List<Integer> refused, boolean validate) {
    }

    /**
     * A round as one player sees it. {@code phase}: pret (not started: the letter is hidden), jeu
     * (writing, until {@code deadline}), attente (my sheet is in, the other is still writing),
     * validation (each checks the other's answers), fini (points counted). The other's answers
     * show from validation on; what they refused of mine and the points, once fini.
     */
    public record RoundDto(int number, String letter, String phase, Instant deadline,
                           boolean meReady, boolean themReady, boolean themStarted, int themFilled,
                           boolean stoppedByMe, boolean stoppedByThem,
                           List<String> mine, List<String> theirs, List<Boolean> mineOnLetter, List<Boolean> theirsOnLetter,
                           List<Integer> iRefused, List<Integer> theyRefused, boolean meValidated, boolean themValidated,
                           List<Integer> myPoints, List<Integer> theirPoints, Integer myScore, Integer theirScore) {
    }

    /** A game seen by one player ({@code them}: the other one); {@code now}: the server's clock, for the timers. */
    public record GameDto(Long id, String mode, List<String> categories, boolean mine, String ownerName, String themName,
                          int myTotal, int theirTotal, Instant now, List<RoundDto> rounds, Instant createdAt, Instant updatedAt) {
    }

    /**
     * In the list. {@code status}, for me, on the last round: a-toi (to play), attente (the other is
     * playing), a-valider, attente-validation (the other is checking), fini (a new round can start).
     */
    public record SummaryDto(Long id, String mode, int categories, boolean mine, String themName, int rounds,
                             int myTotal, int theirTotal, String status, Instant updatedAt) {
    }

    /** What /topic/petit-bac says: something changed in that game, open screens reload it. */
    public record PingDto(Long gameId, Long by) {
    }
}
