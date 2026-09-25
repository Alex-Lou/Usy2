package com.memocat.ops;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class KeepAlivePingerTest {

    @Test
    void disabledWhenNoUrl() {
        KeepAlivePinger pinger = new KeepAlivePinger("");
        assertThat(pinger.enabled()).isFalse();
        assertThatCode(pinger::ping).doesNotThrowAnyException();
    }

    @Test
    void normalizesTrailingSlash() {
        KeepAlivePinger pinger = new KeepAlivePinger("https://memocat.onrender.com/");
        assertThat(pinger.enabled()).isTrue();
        assertThat(pinger.target()).isEqualTo("https://memocat.onrender.com/");
    }

    @Test
    void neverThrowsWhenTargetUnreachable() {
        // Port 1 on localhost is closed: the failure must be swallowed and logged.
        KeepAlivePinger pinger = new KeepAlivePinger("http://127.0.0.1:1");
        assertThatCode(pinger::ping).doesNotThrowAnyException();
    }
}
