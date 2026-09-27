package com.memocat.push;

import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECPrivateKeySpec;
import java.util.Arrays;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebPushCryptoTest {

    // RFC 8291, Appendix A (also reproduced by the RFC author's reference implementation).
    private static final String AS_PUBLIC = "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
    private static final String AS_PRIVATE = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";
    private static final String UA_PUBLIC = "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
    private static final String AUTH_SECRET = "BTBZMqHH6r4Tts7J_aSIgg";
    private static final String SALT = "DGv6ra1nlYgDCS1FRnbzlw";
    private static final String PLAINTEXT = "When I grow up, I want to be a watermelon";
    private static final String MESSAGE = "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN";

    @Test
    void encryptMatchesRfc8291TestVector() throws Exception {
        ECPublicKey asPublic = WebPushCrypto.decodePoint(WebPushCrypto.fromB64url(AS_PUBLIC));
        PrivateKey asPrivate = KeyFactory.getInstance("EC").generatePrivate(
                new ECPrivateKeySpec(new BigInteger(1, WebPushCrypto.fromB64url(AS_PRIVATE)), WebPushCrypto.P256));

        byte[] body = WebPushCrypto.encrypt(PLAINTEXT.getBytes(StandardCharsets.UTF_8),
                WebPushCrypto.fromB64url(UA_PUBLIC), WebPushCrypto.fromB64url(AUTH_SECRET),
                new KeyPair(asPublic, asPrivate), WebPushCrypto.fromB64url(SALT));

        assertThat(WebPushCrypto.b64url(body)).isEqualTo(MESSAGE);
    }

    @Test
    void pointRoundTripsAndRejectsOffCurve() {
        byte[] point = WebPushCrypto.fromB64url(UA_PUBLIC);
        assertThat(WebPushCrypto.encodePoint(WebPushCrypto.decodePoint(point))).isEqualTo(point);

        byte[] tampered = Arrays.copyOf(point, point.length);
        tampered[64] ^= 1;
        assertThatThrownBy(() -> WebPushCrypto.decodePoint(tampered)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> WebPushCrypto.decodePoint(Arrays.copyOf(point, 33)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void acceptsStandardBase64FromBrowsers() {
        byte[] secret = WebPushCrypto.fromB64url(AUTH_SECRET);
        String standard = Base64.getEncoder().encodeToString(secret); // with + / and padding
        assertThat(WebPushCrypto.fromB64url(standard)).isEqualTo(secret);
    }

    @Test
    void vapidJwtIsVerifiableEs256() throws Exception {
        KeyPair vapid = WebPushCrypto.generateKeyPair();
        String jwt = WebPushCrypto.vapidJwt("https://fcm.googleapis.com", "https://memocat.example", 1_900_000_000L,
                vapid.getPrivate());

        String[] parts = jwt.split("\\.");
        assertThat(parts).hasSize(3);
        assertThat(new String(WebPushCrypto.fromB64url(parts[1]), StandardCharsets.UTF_8))
                .isEqualTo("{\"aud\":\"https://fcm.googleapis.com\",\"exp\":1900000000,\"sub\":\"https://memocat.example\"}");
        assertThat(WebPushCrypto.fromB64url(parts[2])).hasSize(64); // raw R||S, not DER

        Signature verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
        verifier.initVerify(vapid.getPublic());
        verifier.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
        assertThat(verifier.verify(WebPushCrypto.fromB64url(parts[2]))).isTrue();
    }
}
