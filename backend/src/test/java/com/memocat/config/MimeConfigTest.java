package com.memocat.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;

import static org.assertj.core.api.Assertions.assertThat;

class MimeConfigTest {

    @Test
    void manifestIsServedAsAManifestAndDefaultsStay() {
        TomcatServletWebServerFactory factory = new TomcatServletWebServerFactory();
        String pngBefore = factory.getMimeMappings().get("png");
        new MimeConfig().customize(factory);

        assertThat(factory.getMimeMappings().get("webmanifest")).isEqualTo("application/manifest+json");
        assertThat(factory.getMimeMappings().get("png")).isEqualTo(pngBefore).isEqualTo("image/png");
    }
}
