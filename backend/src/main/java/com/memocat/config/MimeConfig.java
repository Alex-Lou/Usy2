package com.memocat.config;

import org.springframework.boot.web.server.MimeMappings;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.servlet.server.ConfigurableServletWebServerFactory;
import org.springframework.stereotype.Component;

/**
 * Serves the PWA manifest with its proper type (application/manifest+json):
 * the servlet container doesn't know ".webmanifest" and would send it as a
 * generic download. Android reads this file to install the app and to list
 * it in the system "Share" menu.
 */
@Component
public class MimeConfig implements WebServerFactoryCustomizer<ConfigurableServletWebServerFactory> {

    @Override
    public void customize(ConfigurableServletWebServerFactory factory) {
        MimeMappings manifest = new MimeMappings();
        manifest.add("webmanifest", "application/manifest+json");
        factory.addMimeMappings(manifest); // on top of the defaults
    }
}
