package com.memocat.asset;

import com.memocat.web.ContentValidationException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

/**
 * Validates a voice message recorded in the browser. The type comes from the
 * content's signature only (WebM on Android/Chrome, MP4 on Safari, Ogg on
 * Firefox); the stored content type is ours, never the client's.
 */
@Component
public class AudioUploadValidator {

    /** A 2-minute recording is ~1 MB; the margin covers higher-bitrate devices. */
    public static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;

    public record AudioType(String extension, String contentType) {
    }

    public AudioType validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ContentValidationException("Aucun enregistrement reçu");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new ContentValidationException("Message vocal trop long");
        }
        byte[] h = head(file);
        if (startsWith(h, 0, 0x1A, 0x45, 0xDF, 0xA3)) {
            return new AudioType("webm", "audio/webm");
        }
        if (startsWith(h, 4, 'f', 't', 'y', 'p')) {
            return new AudioType("m4a", "audio/mp4");
        }
        if (startsWith(h, 0, 'O', 'g', 'g', 'S')) {
            return new AudioType("ogg", "audio/ogg");
        }
        throw new ContentValidationException("Format audio non reconnu");
    }

    private static byte[] head(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            return in.readNBytes(12);
        } catch (IOException e) {
            throw new ContentValidationException("Lecture de l'enregistrement impossible");
        }
    }

    private static boolean startsWith(byte[] data, int offset, int... prefix) {
        if (data.length < offset + prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if ((data[offset + i] & 0xFF) != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
