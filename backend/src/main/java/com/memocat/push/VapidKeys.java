package com.memocat.push;

import com.memocat.domain.VapidKey;
import com.memocat.repository.VapidKeyRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;

/**
 * The server's VAPID identity. Generated on first use and stored in the database,
 * so there is no secret to configure and restarts keep the same key (existing
 * browser subscriptions stay valid). The private key never leaves the server.
 */
@Component
public class VapidKeys {

    private record Loaded(String publicKey, PrivateKey privateKey) {
    }

    private final VapidKeyRepository repository;
    private Loaded loaded;

    public VapidKeys(VapidKeyRepository repository) {
        this.repository = repository;
    }

    /** Public key as the browser expects it (applicationServerKey): base64url point. */
    public String publicKey() {
        return load().publicKey();
    }

    PrivateKey privateKey() {
        return load().privateKey();
    }

    private synchronized Loaded load() {
        if (loaded == null) {
            loaded = repository.findById(VapidKey.SINGLETON_ID).map(VapidKeys::decode).orElseGet(this::generate);
        }
        return loaded;
    }

    private Loaded generate() {
        KeyPair pair = WebPushCrypto.generateKeyPair();
        String publicKey = WebPushCrypto.b64url(WebPushCrypto.encodePoint((ECPublicKey) pair.getPublic()));
        String privateKey = Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded());
        try {
            repository.saveAndFlush(new VapidKey(publicKey, privateKey));
            return new Loaded(publicKey, pair.getPrivate());
        } catch (DataIntegrityViolationException raced) {
            // Another instance (e.g. during a deploy) stored its key first: use that one.
            return repository.findById(VapidKey.SINGLETON_ID).map(VapidKeys::decode).orElseThrow(() -> raced);
        }
    }

    private static Loaded decode(VapidKey key) {
        try {
            PrivateKey privateKey = KeyFactory.getInstance("EC")
                    .generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(key.getPrivateKey())));
            return new Loaded(key.getPublicKey(), privateKey);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Stored VAPID key is unreadable", e);
        }
    }
}
