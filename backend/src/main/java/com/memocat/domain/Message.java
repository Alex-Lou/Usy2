package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A chat message in the single conversation between the two users. The recipient
 * is implicit (the other user). {@code readAt} is reserved for a future read
 * receipt feature and is unused in V1.
 */
@Entity
@Table(name = "message")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false)
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "read_at")
    private Instant readAt;

    /** Optional photo, GIF or document sent with the message. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attachment_asset_id")
    private Asset attachment;

    /** Optional earlier message this one answers. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_id")
    private Message replyTo;

    protected Message() {
        // for JPA
    }

    public Message(User sender, String content, Asset attachment) {
        this(sender, content, attachment, null);
    }

    public Message(User sender, String content, Asset attachment, Message replyTo) {
        this.sender = sender;
        this.content = content;
        this.attachment = attachment;
        this.replyTo = replyTo;
    }

    public Message getReplyTo() {
        return replyTo;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public User getSender() {
        return sender;
    }

    public String getContent() {
        return content;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public Asset getAttachment() {
        return attachment;
    }
}
