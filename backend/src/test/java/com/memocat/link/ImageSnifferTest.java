package com.memocat.link;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class ImageSnifferTest {

    @Test
    void recognisesThumbnailFormats() {
        assertThat(ImageSniffer.type(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0})).isEqualTo("image/jpeg");
        assertThat(ImageSniffer.type(new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})).isEqualTo("image/png");
        assertThat(ImageSniffer.type("GIF89a".getBytes(StandardCharsets.US_ASCII))).isEqualTo("image/gif");
        assertThat(ImageSniffer.type("RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.US_ASCII))).isEqualTo("image/webp");
    }

    @Test
    void refusesSvgHtmlAndGarbage() {
        assertThat(ImageSniffer.type("<svg onload=alert(1)>".getBytes(StandardCharsets.UTF_8))).isNull();
        assertThat(ImageSniffer.type("<html>".getBytes(StandardCharsets.UTF_8))).isNull();
        assertThat(ImageSniffer.type(new byte[0])).isNull();
    }
}
