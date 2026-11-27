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

    /** An audio file sent from the phone (a song, a recording made elsewhere): same cap as documents. */
    public static final long MAX_FILE_BYTES = 10L * 1024 * 1024;

    public record AudioType(String extension, String contentType) {
    }

    /**
     * An audio file picked on the device: the formats phones and computers
     * commonly hold, recognised from their content (never the name or the
     * type the client sent).
     */
    public AudioType validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ContentValidationException("Aucun fichier reçu");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new ContentValidationException("Fichier audio trop lourd (max 10 Mo)");
        }
        byte[] h = head(file);
        AudioType recorded = recorded(h);
        if (recorded != null) {
            return recorded;
        }
        if (startsWith(h, 0, 'I', 'D', '3') || isMpegFrame(h)) {
            return new AudioType("mp3", "audio/mpeg");
        }
        if (startsWith(h, 0, 'R', 'I', 'F', 'F') && startsWith(h, 8, 'W', 'A', 'V', 'E')) {
            return new AudioType("wav", "audio/wav");
        }
        if (startsWith(h, 0, 'f', 'L', 'a', 'C')) {
            return new AudioType("flac", "audio/flac");
        }
        if (isAdts(h)) {
            return new AudioType("aac", "audio/aac");
        }
        throw new ContentValidationException("Format audio non reconnu (MP3, M4A, WAV, OGG, FLAC, AAC)");
    }

    /** An MPEG audio frame header: 11 sync bits, then a layer that is not "reserved". */
    private static boolean isMpegFrame(byte[] h) {
        return h.length >= 2 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xE0) == 0xE0 && (h[1] & 0x06) != 0;
    }

    /** Raw AAC (ADTS): 12 sync bits, layer bits 00. */
    private static boolean isAdts(byte[] h) {
        return h.length >= 2 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xF6) == 0xF0;
    }

    public AudioType validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ContentValidationException("Aucun enregistrement reçu");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new ContentValidationException("Message vocal trop long");
        }
        AudioType type = recorded(head(file));
        if (type == null) {
            throw new ContentValidationException("Format audio non reconnu");
        }
        return type;
    }

    /** What browsers record: WebM (Android/Chrome), MP4 (Safari), Ogg (Firefox). */
    private static AudioType recorded(byte[] h) {
        if (startsWith(h, 0, 0x1A, 0x45, 0xDF, 0xA3)) {
            return new AudioType("webm", "audio/webm");
        }
        if (startsWith(h, 4, 'f', 't', 'y', 'p')) {
            return new AudioType("m4a", "audio/mp4");
        }
        if (startsWith(h, 0, 'O', 'g', 'g', 'S')) {
            return new AudioType("ogg", "audio/ogg");
        }
        return null;
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
