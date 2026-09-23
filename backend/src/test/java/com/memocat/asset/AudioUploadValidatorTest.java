package com.memocat.asset;

import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AudioUploadValidatorTest {

    private final AudioUploadValidator validator = new AudioUploadValidator();

    private static MockMultipartFile file(String clientType, byte[] bytes) {
        return new MockMultipartFile("file", "blob", clientType, bytes);
    }

    private static byte[] bytes(int... values) {
        byte[] b = new byte[values.length];
        for (int i = 0; i < values.length; i++) {
            b[i] = (byte) values[i];
        }
        return b;
    }

    @Test
    void recordingsAreRecognisedByTheirSignatureNotTheClientType() {
        assertThat(validator.validate(file("text/html", bytes(0x1A, 0x45, 0xDF, 0xA3, 0x9F))).contentType())
                .isEqualTo("audio/webm");
        assertThat(validator.validate(file("", bytes(0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'M', '4', 'A', ' '))).contentType())
                .isEqualTo("audio/mp4");
        assertThat(validator.validate(file(null, bytes('O', 'g', 'g', 'S', 0))).extension()).isEqualTo("ogg");
    }

    @Test
    void anythingElseIsRejected() {
        assertThatThrownBy(() -> validator.validate(file("audio/webm", "<script>alert(1)</script>".getBytes())))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> validator.validate(file("audio/webm", new byte[0])))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> validator.validate(file("audio/webm", bytes(0x1A, 0x45))))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void tooLongRecordingsAreRejected() {
        byte[] big = new byte[(int) AudioUploadValidator.MAX_SIZE_BYTES + 1];
        System.arraycopy(bytes(0x1A, 0x45, 0xDF, 0xA3), 0, big, 0, 4);
        assertThatThrownBy(() -> validator.validate(file("audio/webm", big)))
                .isInstanceOf(ContentValidationException.class)
                .hasMessageContaining("trop long");
    }
}
