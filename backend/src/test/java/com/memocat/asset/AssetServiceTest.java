package com.memocat.asset;

import com.memocat.domain.Asset;
import com.memocat.domain.AssetContent;
import com.memocat.domain.User;
import com.memocat.repository.AssetContentRepository;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssetServiceTest {

    @Mock private AssetRepository assets;
    @Mock private AssetContentRepository contents;
    @Mock private UserRepository users;

    private AssetService service;
    private final User lou = new User("lou", "h", "Lou");

    @BeforeEach
    void setUp() {
        service = new AssetService(assets, contents, users, new ImageUploadValidator(), new DocumentUploadValidator(), 1);
        lenient().when(users.findByUsername("lou")).thenReturn(Optional.of(lou));
    }

    private static MockMultipartFile pdf(String name, int size) {
        byte[] b = new byte[size];
        System.arraycopy("%PDF-".getBytes(), 0, b, 0, 5);
        return new MockMultipartFile("file", name, "application/octet-stream", b);
    }

    @Test
    void documentIsStoredWithOurContentTypeAndACleanName() {
        when(assets.totalSizeBytes()).thenReturn(0L);
        when(assets.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        var dto = service.uploadDocument("lou", pdf("..\\\\dossier/Billets\u0007 avion.pdf", 100));

        assertThat(dto.contentType()).isEqualTo("application/pdf");
        assertThat(dto.originalFilename()).isEqualTo("Billets avion.pdf");
        verify(contents).save(any(AssetContent.class));
    }

    @Test
    void uploadsStopWhenTheQuotaWouldBeExceeded() {
        when(assets.totalSizeBytes()).thenReturn(1024L * 1024 - 50); // quota = 1 MB

        assertThatThrownBy(() -> service.uploadDocument("lou", pdf("a.pdf", 100)))
                .isInstanceOf(ContentValidationException.class)
                .hasMessageContaining("stockage plein");
        verify(assets, never()).save(any());
    }

    @Test
    void usageReportsUsedAndQuota() {
        when(assets.totalSizeBytes()).thenReturn(1234L);
        var usage = service.usage();
        assertThat(usage.usedBytes()).isEqualTo(1234L);
        assertThat(usage.quotaBytes()).isEqualTo(1024L * 1024);
    }

    @Test
    void longNamesAreShortenedButKeepTheirExtension() {
        String name = AssetService.safeName("x".repeat(300) + ".docx", "fallback");
        assertThat(name).hasSize(120).endsWith(".docx");
        assertThat(AssetService.safeName("/", "fallback")).isEqualTo("fallback");
    }
}
