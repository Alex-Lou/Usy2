package com.memocat.push;

import com.memocat.domain.PushSubscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

/**
 * Delivers one encrypted message to one browser push service (RFC 8030) with
 * VAPID authentication. Logs never include the endpoint (it is a bearer URL)
 * nor the payload.
 */
@Component
public class WebPushSender {

    public enum Outcome { DELIVERED, GONE, FAILED }

    private static final Logger log = LoggerFactory.getLogger(WebPushSender.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(10);
    private static final long JWT_LIFETIME_SECONDS = 12 * 3600;
    private static final String TTL_SECONDS = "86400"; // keep undelivered notifications one day

    private final VapidKeys vapidKeys;
    private final String subject;
    private final SecureRandom random = new SecureRandom();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    public WebPushSender(VapidKeys vapidKeys, @Value("${memocat.push.subject}") String subject) {
        this.vapidKeys = vapidKeys;
        this.subject = subject;
    }

    public Outcome send(PushSubscription subscription, byte[] payload, boolean urgent) {
        if (!PushEndpointPolicy.isAllowed(subscription.getEndpoint())) {
            return Outcome.GONE; // registered before a policy change: drop it
        }
        byte[] body;
        try {
            byte[] salt = new byte[16];
            random.nextBytes(salt);
            body = WebPushCrypto.encrypt(payload,
                    WebPushCrypto.fromB64url(subscription.getP256dh()),
                    WebPushCrypto.fromB64url(subscription.getAuth()),
                    WebPushCrypto.generateKeyPair(), salt);
        } catch (IllegalArgumentException badKeys) {
            return Outcome.GONE;
        }

        URI endpoint = URI.create(subscription.getEndpoint());
        String audience = endpoint.getScheme() + "://" + endpoint.getHost();
        String jwt = WebPushCrypto.vapidJwt(audience, subject,
                Instant.now().getEpochSecond() + JWT_LIFETIME_SECONDS, vapidKeys.privateKey());

        HttpRequest request = HttpRequest.newBuilder(endpoint)
                .timeout(TIMEOUT)
                .header("Content-Type", "application/octet-stream")
                .header("Content-Encoding", "aes128gcm")
                .header("TTL", TTL_SECONDS)
                .header("Urgency", urgent ? "high" : "normal")
                .header("Authorization", "vapid t=" + jwt + ", k=" + vapidKeys.publicKey())
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();
        try {
            int status = http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            if (status >= 200 && status < 300) {
                return Outcome.DELIVERED;
            }
            if (status == 404 || status == 410) {
                return Outcome.GONE; // unsubscribed or expired on the browser side
            }
            log.warn("Push service {} answered {}", endpoint.getHost(), status);
            return Outcome.FAILED;
        } catch (IOException e) {
            log.warn("Push service {} unreachable: {}", endpoint.getHost(), e.getClass().getSimpleName());
            return Outcome.FAILED;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Outcome.FAILED;
        }
    }
}
