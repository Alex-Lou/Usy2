package com.memocat.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Digital Asset Links: tells Android that the « Messages » app (package
 * {@link #PACKAGE}) belongs to this site, so it opens full screen, without an
 * address bar (a Trusted Web Activity). The app's signing certificate
 * fingerprints come from MEMOCAT_ANDROID_CERT_SHA256 (comma-separated, as
 * keytool prints them); none set, the list is empty and no app is trusted.
 * Fingerprints are public: they identify the key, they don't reveal it.
 */
@RestController
public class AssetLinksController {

    static final String PACKAGE = "com.memocat.messages";
    private static final Pattern SHA256 = Pattern.compile("^([0-9A-F]{2}:){31}[0-9A-F]{2}$");
    private static final Logger log = LoggerFactory.getLogger(AssetLinksController.class);

    private final List<Map<String, Object>> statements;

    public AssetLinksController(@Value("${memocat.android.cert-sha256:}") String fingerprints) {
        this.statements = statements(fingerprints);
    }

    @GetMapping(value = "/.well-known/assetlinks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> assetLinks() {
        return ResponseEntity.ok(statements);
    }

    /** One statement for the valid fingerprints; the others are ignored, and said so in the log. */
    static List<Map<String, Object>> statements(String raw) {
        List<String> valid = Arrays.stream(raw == null ? new String[0] : raw.split(","))
                .map(s -> s.trim().toUpperCase(Locale.ROOT))
                .filter(s -> !s.isEmpty())
                .filter(s -> {
                    boolean ok = SHA256.matcher(s).matches();
                    if (!ok) log.warn("MEMOCAT_ANDROID_CERT_SHA256 : empreinte ignorée, format attendu AA:BB:… (32 octets)");
                    return ok;
                })
                .distinct()
                .toList();
        if (valid.isEmpty()) return List.of();
        return List.of(Map.of(
                "relation", List.of("delegate_permission/common.handle_all_urls"),
                "target", Map.of(
                        "namespace", "android_app",
                        "package_name", PACKAGE,
                        "sha256_cert_fingerprints", valid)));
    }
}
