package com.memocat.push;

import com.memocat.domain.PushSubscription;
import com.memocat.domain.User;
import com.memocat.push.dto.PushSubscribeRequest;
import com.memocat.repository.PushSubscriptionRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PushSubscriptionService {

    static final int MAX_DEVICES_PER_USER = 10;
    private static final int AUTH_SECRET_BYTES = 16;

    private final PushSubscriptionRepository subscriptions;
    private final UserRepository users;

    public PushSubscriptionService(PushSubscriptionRepository subscriptions, UserRepository users) {
        this.subscriptions = subscriptions;
        this.users = users;
    }

    /** "Log out all my devices": no device gets this account's notifications any more. */
    @Transactional
    public void removeAllOf(String username) {
        users.findByUsername(username).ifPresent(user ->
                subscriptions.deleteAll(subscriptions.findByUserIdOrderByCreatedAtAsc(user.getId())));
    }

    /**
     * Registers this device for the user (idempotent per endpoint; a device that
     * changes account is re-bound). Keeps at most {@value #MAX_DEVICES_PER_USER}
     * devices per user, dropping the oldest.
     */
    @Transactional
    public void subscribe(String username, PushSubscribeRequest request) {
        String endpoint = request.endpoint();
        if (!PushEndpointPolicy.isAllowed(endpoint)) {
            throw new ContentValidationException("Service de notification non reconnu");
        }
        String p256dh = canonicalPublicKey(request.keys().p256dh());
        String auth = canonicalAuthSecret(request.keys().auth());
        User user = users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        subscriptions.findByEndpoint(endpoint).ifPresentOrElse(
                existing -> existing.rebind(user, p256dh, auth),
                () -> subscriptions.save(new PushSubscription(user, endpoint, p256dh, auth)));

        List<PushSubscription> devices = subscriptions.findByUserIdOrderByCreatedAtAsc(user.getId());
        if (devices.size() > MAX_DEVICES_PER_USER) {
            subscriptions.deleteAll(devices.subList(0, devices.size() - MAX_DEVICES_PER_USER));
        }
    }

    private static String canonicalPublicKey(String value) {
        try {
            byte[] point = WebPushCrypto.fromB64url(value);
            WebPushCrypto.decodePoint(point);
            return WebPushCrypto.b64url(point);
        } catch (IllegalArgumentException e) {
            throw new ContentValidationException("Clé de notification invalide");
        }
    }

    private static String canonicalAuthSecret(String value) {
        try {
            byte[] secret = WebPushCrypto.fromB64url(value);
            if (secret.length != AUTH_SECRET_BYTES) {
                throw new IllegalArgumentException();
            }
            return WebPushCrypto.b64url(secret);
        } catch (IllegalArgumentException e) {
            throw new ContentValidationException("Clé de notification invalide");
        }
    }
}
