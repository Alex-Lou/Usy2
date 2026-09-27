package com.memocat.push;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigInteger;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECFieldFp;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.util.Arrays;
import java.util.Base64;

/**
 * Web Push message encryption (RFC 8291, "aes128gcm" content coding from
 * RFC 8188) and VAPID authentication (RFC 8292), built only on JDK crypto
 * primitives (ECDH P-256, HMAC-SHA-256, AES-128-GCM, ES256) — no third-party
 * library. Pure functions: randomness (salt, ephemeral key) is injectable so the
 * output can be checked against the reference implementation in tests.
 */
final class WebPushCrypto {

    static final ECParameterSpec P256 = p256();
    private static final int RECORD_SIZE = 4096;
    private static final Base64.Encoder B64URL = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64URL_DEC = Base64.getUrlDecoder();

    private WebPushCrypto() {
    }

    private static ECParameterSpec p256() {
        try {
            AlgorithmParameters params = AlgorithmParameters.getInstance("EC");
            params.init(new ECGenParameterSpec("secp256r1"));
            return params.getParameterSpec(ECParameterSpec.class);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("P-256 unavailable", e);
        }
    }

    static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator gen = KeyPairGenerator.getInstance("EC");
            gen.initialize(new ECGenParameterSpec("secp256r1"));
            return gen.generateKeyPair();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Cannot generate P-256 key", e);
        }
    }

    static String b64url(byte[] data) {
        return B64URL.encodeToString(data);
    }

    static byte[] fromB64url(String value) {
        // Browsers may send standard or URL-safe base64, with or without padding.
        String normalized = value.trim().replace('+', '-').replace('/', '_').replace("=", "");
        return B64URL_DEC.decode(normalized);
    }

    /** 65-byte uncompressed point: 0x04 || X || Y. */
    static byte[] encodePoint(ECPublicKey key) {
        byte[] out = new byte[65];
        out[0] = 0x04;
        System.arraycopy(fixed32(key.getW().getAffineX()), 0, out, 1, 32);
        System.arraycopy(fixed32(key.getW().getAffineY()), 0, out, 33, 32);
        return out;
    }

    /** Parses an uncompressed P-256 point, rejecting anything not on the curve. */
    static ECPublicKey decodePoint(byte[] point) {
        if (point == null || point.length != 65 || point[0] != 0x04) {
            throw new IllegalArgumentException("Expected an uncompressed P-256 point");
        }
        BigInteger x = new BigInteger(1, Arrays.copyOfRange(point, 1, 33));
        BigInteger y = new BigInteger(1, Arrays.copyOfRange(point, 33, 65));
        BigInteger p = ((ECFieldFp) P256.getCurve().getField()).getP();
        BigInteger lhs = y.modPow(BigInteger.TWO, p);
        BigInteger rhs = x.pow(3).add(P256.getCurve().getA().multiply(x)).add(P256.getCurve().getB()).mod(p);
        if (x.compareTo(p) >= 0 || y.compareTo(p) >= 0 || !lhs.equals(rhs)) {
            throw new IllegalArgumentException("Point is not on P-256");
        }
        try {
            return (ECPublicKey) KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(new ECPoint(x, y), P256));
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("Invalid P-256 point", e);
        }
    }

    /**
     * Encrypts {@code plaintext} for one subscription and returns the full request
     * body (header || ciphertext), per RFC 8291 §3-4.
     */
    static byte[] encrypt(byte[] plaintext, byte[] uaPublic, byte[] authSecret, KeyPair senderKeys, byte[] salt) {
        if (salt.length != 16) {
            throw new IllegalArgumentException("Salt must be 16 bytes");
        }
        if (plaintext.length + 1 + 16 > RECORD_SIZE) {
            throw new IllegalArgumentException("Payload too large for a single record");
        }
        try {
            ECPublicKey ua = decodePoint(uaPublic);
            byte[] asPublic = encodePoint((ECPublicKey) senderKeys.getPublic());

            KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
            agreement.init(senderKeys.getPrivate());
            agreement.doPhase(ua, true);
            byte[] ecdhSecret = agreement.generateSecret();

            byte[] prkKey = hmac(authSecret, ecdhSecret);
            byte[] keyInfo = concat("WebPush: info".getBytes(StandardCharsets.US_ASCII), new byte[] {0}, uaPublic, asPublic);
            byte[] ikm = hmac(prkKey, keyInfo, new byte[] {1});

            byte[] prk = hmac(salt, ikm);
            byte[] cek = Arrays.copyOf(hmac(prk, "Content-Encoding: aes128gcm".getBytes(StandardCharsets.US_ASCII), new byte[] {0, 1}), 16);
            byte[] nonce = Arrays.copyOf(hmac(prk, "Content-Encoding: nonce".getBytes(StandardCharsets.US_ASCII), new byte[] {0, 1}), 12);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
            byte[] ciphertext = cipher.doFinal(concat(plaintext, new byte[] {2})); // 0x02 = last record

            ByteBuffer header = ByteBuffer.allocate(16 + 4 + 1 + asPublic.length);
            header.put(salt).putInt(RECORD_SIZE).put((byte) asPublic.length).put(asPublic);
            return concat(header.array(), ciphertext);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Web Push encryption failed", e);
        }
    }

    /** VAPID JWT (ES256, raw R||S signature) for the push service {@code audience}. */
    static String vapidJwt(String audience, String subject, long expiresAtEpochSeconds, PrivateKey vapidPrivate) {
        String header = b64url("{\"typ\":\"JWT\",\"alg\":\"ES256\"}".getBytes(StandardCharsets.UTF_8));
        String claims = b64url(("{\"aud\":\"" + json(audience) + "\",\"exp\":" + expiresAtEpochSeconds
                + ",\"sub\":\"" + json(subject) + "\"}").getBytes(StandardCharsets.UTF_8));
        String signingInput = header + "." + claims;
        try {
            Signature signer = Signature.getInstance("SHA256withECDSAinP1363Format");
            signer.initSign(vapidPrivate);
            signer.update(signingInput.getBytes(StandardCharsets.US_ASCII));
            return signingInput + "." + b64url(signer.sign());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("VAPID signing failed", e);
        }
    }

    private static String json(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static byte[] fixed32(BigInteger value) {
        byte[] raw = value.toByteArray();
        if (raw.length == 32) {
            return raw;
        }
        byte[] out = new byte[32];
        if (raw.length > 32) { // leading sign byte
            System.arraycopy(raw, raw.length - 32, out, 0, 32);
        } else {
            System.arraycopy(raw, 0, out, 32 - raw.length, raw.length);
        }
        return out;
    }

    private static byte[] hmac(byte[] key, byte[]... parts) throws GeneralSecurityException {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        for (byte[] part : parts) {
            mac.update(part);
        }
        return mac.doFinal();
    }

    private static byte[] concat(byte[]... parts) {
        int length = 0;
        for (byte[] p : parts) {
            length += p.length;
        }
        byte[] out = new byte[length];
        int offset = 0;
        for (byte[] p : parts) {
            System.arraycopy(p, 0, out, offset, p.length);
            offset += p.length;
        }
        return out;
    }
}
