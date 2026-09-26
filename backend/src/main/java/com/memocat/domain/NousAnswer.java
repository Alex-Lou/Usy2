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

/** 💞 Nous deux: what a person answered about themself (a choice, or their own words). */
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

    private Short choice;

    @Column(name = "answer_text")
    private String text;

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

    public Integer getChoice() {
        return choice == null ? null : choice.intValue();
    }

    public String getText() {
        return text;
    }

    /** @return whether the answer changed (the other person's guesses then no longer hold). */
    public boolean set(Integer newChoice, String newText, Instant now) {
        Short c = newChoice == null ? null : newChoice.shortValue();
        boolean changed = !java.util.Objects.equals(choice, c) || !java.util.Objects.equals(text, newText);
        choice = c;
        text = newText;
        updatedAt = now;
        return changed;
    }
}
