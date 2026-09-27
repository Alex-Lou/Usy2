package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * 💞 Nous deux: what a person answered about themself: ticked choices as a bit
 * set (a single choice or a point on a scale is one bit), their own words, or
 * an order ("2,0,3,1") for a ranking.
 */
@Entity
@Table(name = "nous_answer")
public class NousAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "question_id", nullable = false)
    private String questionId;

    /** Bit i set: option i ticked. */
    private Integer choices;

    @Column(name = "answer_text")
    private String text;

    /** A ranking: the option indexes, first to last, comma-separated. */
    private String ranking;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected NousAnswer() {
    }

    public NousAnswer(User user, String questionId) {
        this.user = user;
        this.questionId = questionId;
    }

    public User getUser() {
        return user;
    }

    public String getQuestionId() {
        return questionId;
    }

    public Integer getChoices() {
        return choices;
    }

    public String getText() {
        return text;
    }

    public String getRanking() {
        return ranking;
    }

    /** @return whether the answer changed (the other person's guesses then no longer hold). */
    public boolean set(Integer newChoices, String newText, String newRanking, Instant now) {
        boolean changed = !java.util.Objects.equals(choices, newChoices) || !java.util.Objects.equals(text, newText)
                || !java.util.Objects.equals(ranking, newRanking);
        choices = newChoices;
        text = newText;
        ranking = newRanking;
        updatedAt = now;
        return changed;
    }
}
