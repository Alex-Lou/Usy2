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

/**
 * One more photo or file of a message sent with several (the first one is
 * {@link Message#getAttachment()}); {@code position} keeps the order they were picked in.
 */
@Entity
@Table(name = "message_extra_attachment")
public class MessageExtraAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false)
    private Long messageId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Column(nullable = false)
    private short position;

    protected MessageExtraAttachment() {
        // for JPA
    }

    public MessageExtraAttachment(Long messageId, Asset asset, int position) {
        this.messageId = messageId;
        this.asset = asset;
        this.position = (short) position;
    }

    public Long getMessageId() {
        return messageId;
    }

    public Asset getAsset() {
        return asset;
    }

    public int getPosition() {
        return position;
    }
}
