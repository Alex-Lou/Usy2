package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/** One entry of someone's bell (see NotificationService). */
@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_id", nullable = false)
    private Long recipientId;

    @Column(nullable = false)
    private String text;

    @Column
    private String excerpt;

    @Column(nullable = false)
    private String url;

    @Column(nullable = false)
    private String tag;

    @Column(nullable = false)
    private boolean read;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Notification() {
        // for JPA
    }

    public Notification(Long recipientId, String text, String excerpt, String url, String tag) {
        this.recipientId = recipientId;
        this.text = text;
        this.excerpt = excerpt;
        this.url = url;
        this.tag = tag;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public void markRead() {
        this.read = true;
    }

    public Long getId() {
        return id;
    }

    public Long getRecipientId() {
        return recipientId;
    }

    public String getText() {
        return text;
    }

    public String getExcerpt() {
        return excerpt;
    }

    public String getUrl() {
        return url;
    }

    public String getTag() {
        return tag;
    }

    public boolean isRead() {
        return read;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
