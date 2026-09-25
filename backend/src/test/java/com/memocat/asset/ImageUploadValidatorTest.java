package com.memocat.asset;

import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageUploadValidatorTest {

    private final ImageUploadValidator validator = new ImageUploadValidator();

    private static final byte[] PNG_MAGIC = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0
    };
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 0, 0};

    @Test
    void acceptsValidPng() {
        MockMultipartFile file = new MockMultipartFile("file", "cat.png", "image/png", PNG_MAGIC);
        assertThat(validator.validate(file)).isEqualTo("png");
    }

    @Test
    void rejectsEmptyFile() {
        MockMultipartFile file = new MockMultipartFile("file", "x.png", "image/png", new byte[0]);
        assertThatThrownBy(() -> validator.validate(file))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsUnsupportedContentType() {
        MockMultipartFile file = new MockMultipartFile("file", "x.txt", "text/plain", PNG_MAGIC);
        assertThatThrownBy(() -> validator.validate(file))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void rejectsContentTypeNotMatchingMagicBytes() {
        // Declared PNG but bytes are JPEG -> disguised upload.
        MockMultipartFile file = new MockMultipartFile("file", "fake.png", "image/png", JPEG_MAGIC);
        assertThatThrownBy(() -> validator.validate(file))
                .isInstanceOf(ContentValidationException.class);
    }
}
