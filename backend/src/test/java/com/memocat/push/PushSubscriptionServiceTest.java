package com.memocat.push;

import com.memocat.domain.PushSubscription;
import com.memocat.domain.User;
import com.memocat.push.dto.PushSubscribeRequest;
import com.memocat.repository.PushSubscriptionRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.security.interfaces.ECPublicKey;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PushSubscriptionServiceTest {

    private static final String ENDPOINT = "https://fcm.googleapis.com/fcm/send/device-1";

    @Mock private PushSubscriptionRepository subscriptions;
    @Mock private UserRepository users;
    @InjectMocks private PushSubscriptionService service;

    private final User lou = withId(new User("lou", "hash", "Lou"), 1L);
    private final byte[] point = WebPushCrypto.encodePoint((ECPublicKey) WebPushCrypto.generateKeyPair().getPublic());
    private final byte[] secret = new byte[16];

    private static <T> T withId(T entity, long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }

    private PushSubscribeRequest request(String endpoint, String p256dh, String auth) {
        return new PushSubscribeRequest(endpoint, new PushSubscribeRequest.Keys(p256dh, auth));
    }

    @Test
    void storesNewDeviceWithCanonicalBase64UrlKeys() {
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(subscriptions.findByEndpoint(ENDPOINT)).thenReturn(Optional.empty());

        // Standard base64 with padding, as some browsers send it.
        service.subscribe("lou", request(ENDPOINT, Base64.getEncoder().encodeToString(point),
                Base64.getEncoder().encodeToString(secret)));

        ArgumentCaptor<PushSubscription> saved = ArgumentCaptor.forClass(PushSubscription.class);
        verify(subscriptions).save(saved.capture());
        assertThat(saved.getValue().getEndpoint()).isEqualTo(ENDPOINT);
        assertThat(saved.getValue().getP256dh()).isEqualTo(WebPushCrypto.b64url(point));
        assertThat(saved.getValue().getAuth()).isEqualTo(WebPushCrypto.b64url(secret));
    }

    @Test
    void sameDeviceIsReboundInsteadOfDuplicated() {
        User sam = withId(new User("sam", "hash", "Sam"), 2L);
        PushSubscription existing = new PushSubscription(sam, ENDPOINT, "old", "old");
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(subscriptions.findByEndpoint(ENDPOINT)).thenReturn(Optional.of(existing));

        service.subscribe("lou", request(ENDPOINT, WebPushCrypto.b64url(point), WebPushCrypto.b64url(secret)));

        verify(subscriptions, never()).save(any());
        assertThat(existing.getUser()).isSameAs(lou);
        assertThat(existing.getP256dh()).isEqualTo(WebPushCrypto.b64url(point));
    }

    @Test
    void keepsOnlyTheNewestDevices() {
        List<PushSubscription> devices = new ArrayList<>();
        for (int i = 0; i < PushSubscriptionService.MAX_DEVICES_PER_USER + 2; i++) {
            devices.add(new PushSubscription(lou, ENDPOINT + i, "k", "s"));
        }
        when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
        when(subscriptions.findByEndpoint(ENDPOINT)).thenReturn(Optional.empty());
        when(subscriptions.findByUserIdOrderByCreatedAtAsc(1L)).thenReturn(devices);

        service.subscribe("lou", request(ENDPOINT, WebPushCrypto.b64url(point), WebPushCrypto.b64url(secret)));

        verify(subscriptions).deleteAll(devices.subList(0, 2));
    }

    @Test
    void rejectsUnknownPushService() {
        assertThatThrownBy(() -> service.subscribe("lou",
                request("https://attacker.example/hook", WebPushCrypto.b64url(point), WebPushCrypto.b64url(secret))))
                .isInstanceOf(ContentValidationException.class);
        verify(subscriptions, never()).save(any());
    }

    @Test
    void rejectsInvalidKeys() {
        byte[] offCurve = point.clone();
        offCurve[64] ^= 1;
        assertThatThrownBy(() -> service.subscribe("lou",
                request(ENDPOINT, WebPushCrypto.b64url(offCurve), WebPushCrypto.b64url(secret))))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.subscribe("lou",
                request(ENDPOINT, WebPushCrypto.b64url(point), WebPushCrypto.b64url(new byte[8]))))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> service.subscribe("lou", request(ENDPOINT, "%%%", WebPushCrypto.b64url(secret))))
                .isInstanceOf(ContentValidationException.class);
        verify(subscriptions, never()).save(any());
    }
}
