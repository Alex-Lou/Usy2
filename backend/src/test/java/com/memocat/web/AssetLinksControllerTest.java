package com.memocat.web;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AssetLinksControllerTest {

    private static final String KEY = "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5";

    @Test
    void noFingerprintTrustsNoApp() {
        assertThat(AssetLinksController.statements("")).isEmpty();
        assertThat(AssetLinksController.statements(null)).isEmpty();
    }

    @Test
    void fingerprintsBecomeOneStatementForTheMessagesApp() {
        List<Map<String, Object>> s = AssetLinksController.statements(" " + KEY.toLowerCase() + " , " + KEY);
        assertThat(s).hasSize(1);
        assertThat(s.get(0).get("relation")).isEqualTo(List.of("delegate_permission/common.handle_all_urls"));
        @SuppressWarnings("unchecked")
        Map<String, Object> target = (Map<String, Object>) s.get(0).get("target");
        assertThat(target).containsEntry("namespace", "android_app").containsEntry("package_name", "com.memocat.messages");
        assertThat(target.get("sha256_cert_fingerprints")).isEqualTo(List.of(KEY)); // upper case, once
    }

    @Test
    void malformedFingerprintsAreIgnored() {
        assertThat(AssetLinksController.statements("pas-une-empreinte, 14:6D")).isEmpty();
        assertThat(AssetLinksController.statements("nope, " + KEY)).hasSize(1);
    }
}
