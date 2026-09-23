package com.memocat.asset;

import com.memocat.web.ContentValidationException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.Map;

/**
 * Validates an image upload: declared content-type must be in the allowlist AND
 * the file's magic bytes must match that type. This blocks disguised uploads
 * (e.g. a script renamed to .png). Size is enforced by Spring multipart limits
 * and re-checked here.
 */
@Component
public class ImageUploadValidator {

    public static final long MAX_SIZE_BYTES = 5L * 1024 * 1024; // 5 MB

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif");

    /** @return the canonical file extension for the validated image. */
    public String validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ContentValidationException("Aucune image reçue");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new ContentValidationException("Image trop lourde (max 5 Mo)");
        }
        String contentType = file.getContentType();
        if (contentType == null || !EXTENSIONS.containsKey(contentType)) {
            throw new ContentValidationException("Format d'image non supporté (JPEG, PNG, WebP ou GIF)");
        }

        byte[] header = readHeader(file);
        if (!magicMatches(contentType, header)) {
            throw new ContentValidationException("Le contenu ne correspond pas à une image valide");
        }
        return EXTENSIONS.get(contentType);
    }

    private byte[] readHeader(MultipartFile file) {
        try {
            byte[] all = file.getBytes();
            return Arrays.copyOf(all, Math.min(all.length, 16));
        } catch (Exception e) {
            throw new ContentValidationException("Lecture de l'image impossible");
        }
    }

    private boolean magicMatches(String contentType, byte[] h) {
        return switch (contentType) {
            case "image/jpeg" -> startsWith(h, 0xFF, 0xD8, 0xFF);
            case "image/png" -> startsWith(h, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
            case "image/gif" -> startsWith(h, 0x47, 0x49, 0x46, 0x38); // "GIF8"
            case "image/webp" -> startsWith(h, 0x52, 0x49, 0x46, 0x46) // "RIFF"
                    && h.length >= 12
                    && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P';
            default -> false;
        };
    }

    private boolean startsWith(byte[] data, int... prefix) {
        if (data.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if ((data[i] & 0xFF) != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
