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

/** 💞 Nous deux: a card someone keeps as a favourite, or marked "on en a parlé". */
@Entity
@Table(name = "nous_mark")
public class NousMark {

    public static final String FAV = "fav";
    public static final String TALKED = "talked";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "question_id", nullable = false)
    private String questionId;

    @Column(nullable = false)
    private String kind;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected NousMark() {
    }

    public NousMark(User user, String questionId, String kind) {
        this.user = user;
        this.questionId = questionId;
        this.kind = kind;
    }

    public User getUser() {
        return user;
    }

    public String getQuestionId() {
        return questionId;
    }

    public String getKind() {
        return kind;
    }
}
