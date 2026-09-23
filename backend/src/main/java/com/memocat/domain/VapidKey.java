package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * The server's VAPID key pair (single row, id = 1). Public key: uncompressed
 * P-256 point, base64url. Private key: PKCS#8, base64.
 */
@Entity
@Table(name = "vapid_key")
public class VapidKey {

    public static final short SINGLETON_ID = 1;

    @Id
    private Short id;

    @Column(name = "public_key", nullable = false)
    private String publicKey;

    @Column(name = "private_key", nullable = false)
    private String privateKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected VapidKey() {
        // for JPA
    }

    public VapidKey(String publicKey, String privateKey) {
        this.id = SINGLETON_ID;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public String getPublicKey() {
        return publicKey;
    }

    public String getPrivateKey() {
        return privateKey;
    }
}
