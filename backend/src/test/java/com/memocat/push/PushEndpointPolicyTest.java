package com.memocat.push;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class PushEndpointPolicyTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "https://fcm.googleapis.com/fcm/send/abc:APA91b",
            "https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
            "https://web.push.apple.com/QGuQyavXutnMKrN",
            "https://wns2-par02p.notify.windows.com/w/?token=BQYAAA",
            "https://FCM.googleapis.com:443/fcm/send/x"})
    void acceptsBrowserPushServices(String endpoint) {
        assertThat(PushEndpointPolicy.isAllowed(endpoint)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://fcm.googleapis.com/fcm/send/x",              // not https
            "https://fcm.googleapis.com.evil.com/x",             // look-alike host
            "https://evilfcm.googleapis.com/x",
            "https://notpush.apple.com/x",
            "https://user:pw@fcm.googleapis.com/x",              // credentials
            "https://fcm.googleapis.com:8443/x",                 // odd port
            "https://localhost/x",
            "https://169.254.169.254/latest/meta-data",
            "file:///etc/passwd",
            "not a url",
            ""})
    void rejectsEverythingElse(String endpoint) {
        assertThat(PushEndpointPolicy.isAllowed(endpoint)).isFalse();
    }
}
