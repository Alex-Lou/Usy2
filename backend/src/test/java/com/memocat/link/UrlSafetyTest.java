package com.memocat.link;

import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.net.InetAddress;
import java.net.UnknownHostException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UrlSafetyTest {

    /** Every host resolves to the given literal address, so no real DNS is used. */
    private static UrlSafety resolvingTo(String ip) {
        return new UrlSafety(host -> new InetAddress[]{InetAddress.getByName(ip)});
    }

    @Test
    void acceptsPublicHttpsLink() {
        assertThat(resolvingTo("93.184.216.34").check("https://example.com/article?id=1").getHost())
                .isEqualTo("example.com");
    }

    @ParameterizedTest
    @ValueSource(strings = {"127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254",
            "0.0.0.0", "100.64.0.1", "198.18.0.1", "255.255.255.255", "::1", "fc00::1", "fe80::1",
            "::ffff:127.0.0.1"})
    void refusesPrivateAndReservedAddresses(String ip) {
        assertThatThrownBy(() -> resolvingTo(ip).check("http://innocent.example/"))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void refusesWhenAnyResolvedAddressIsPrivate() throws Exception {
        UrlSafety safety = new UrlSafety(host -> new InetAddress[]{
                InetAddress.getByName("93.184.216.34"), InetAddress.getByName("10.0.0.1")});
        assertThatThrownBy(() -> safety.check("https://example.com/"))
                .isInstanceOf(ContentValidationException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ftp://example.com/", "file:///etc/passwd", "javascript:alert(1)",
            "https://example.com:8080/", "https://user:pw@example.com/", "https://localhost/",
            "https://printer.local/", "https://metadata.google.internal/", "not a url", ""})
    void refusesBadLinks(String url) {
        assertThatThrownBy(() -> resolvingTo("93.184.216.34").check(url))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void refusesTooLongLinks() {
        String url = "https://example.com/" + "a".repeat(UrlSafety.MAX_URL);
        assertThatThrownBy(() -> resolvingTo("93.184.216.34").check(url))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void refusesUnknownHosts() {
        UrlSafety safety = new UrlSafety(host -> {
            throw new UnknownHostException(host);
        });
        assertThatThrownBy(() -> safety.check("https://nowhere.example/"))
                .isInstanceOf(ContentValidationException.class);
    }
}
