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

/** "Toi & moi": what a person answered about themself (the other one then guesses it). */
@Entity
@Table(name = "quiz_self_answer")
public class QuizSelfAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "question_id", nullable = false)
    private String questionId;

    @Column(nullable = false)
    private short choice;

    protected QuizSelfAnswer() {
    }

    public QuizSelfAnswer(User user, String questionId, int choice) {
        this.user = user;
        this.questionId = questionId;
        this.choice = (short) choice;
    }

    public String getQuestionId() {
        return questionId;
    }

    public int getChoice() {
        return choice;
    }

    public void setChoice(int choice) {
        this.choice = (short) choice;
    }
}
