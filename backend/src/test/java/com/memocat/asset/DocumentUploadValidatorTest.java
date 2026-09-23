package com.memocat.asset;

import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DocumentUploadValidatorTest {

    private final DocumentUploadValidator validator = new DocumentUploadValidator();

    private static MockMultipartFile file(String name, String clientType, byte[] bytes) {
        return new MockMultipartFile("file", name, clientType, bytes);
    }

    private static byte[] bytes(int... values) {
        byte[] b = new byte[values.length];
        for (int i = 0; i < values.length; i++) {
            b[i] = (byte) values[i];
        }
        return b;
    }

    @Test
    void pdfIsRecognisedByItsSignatureAndGetsOurContentType() {
        var type = validator.validate(file("Billets.PDF", "application/octet-stream",
                "%PDF-1.7\n...".getBytes(StandardCharsets.US_ASCII)));
        assertThat(type.extension()).isEqualTo("pdf");
        assertThat(type.contentType()).isEqualTo("application/pdf");
    }

    @Test
    void officeFilesAreZipOrOle() {
        assertThat(validator.validate(file("devis.docx", "", bytes('P', 'K', 3, 4, 0))).contentType())
                .endsWith("wordprocessingml.document");
        assertThat(validator.validate(file("budget.xls", null, bytes(0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1)))
                .contentType()).isEqualTo("application/vnd.ms-excel");
    }

    @Test
    void textMustNotBeBinary() {
        assertThat(validator.validate(file("liste.txt", "text/plain", "lait, pain".getBytes(StandardCharsets.UTF_8)))
                .contentType()).isEqualTo("text/plain");
        assertThatThrownBy(() -> validator.validate(file("x.csv", "text/csv", bytes('a', 0, 'b'))))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void disguisedOrUnsupportedFilesAreRejected() {
        // A script renamed to .pdf, an HTML page, an executable, an SVG.
        assertThatThrownBy(() -> validator.validate(file("facture.pdf", "application/pdf", "<script>".getBytes())))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> validator.validate(file("page.html", "text/html", "<html>".getBytes())))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> validator.validate(file("setup.exe", "application/octet-stream", bytes('M', 'Z'))))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> validator.validate(file("logo.svg", "image/svg+xml", "<svg>".getBytes())))
                .isInstanceOf(ContentValidationException.class);
        assertThatThrownBy(() -> validator.validate(file("sans-extension", "application/pdf", "%PDF-".getBytes())))
                .isInstanceOf(ContentValidationException.class);
    }

    @Test
    void sizeIsCappedAt10Mb() {
        byte[] big = new byte[(int) DocumentUploadValidator.MAX_SIZE_BYTES + 1];
        big[0] = '%';
        assertThatThrownBy(() -> validator.validate(file("gros.pdf", "application/pdf", big)))
                .isInstanceOf(ContentValidationException.class)
                .hasMessageContaining("10 Mo");
    }
}
