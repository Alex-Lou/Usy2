package com.memocat.asset;

import com.memocat.web.ContentValidationException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Map;

/**
 * Validates a document upload (PDF, office files, plain text). The type comes
 * from the file extension — browsers send unreliable MIME types for office
 * files — and the content's signature must match it. The stored content type
 * is our canonical one, never the client's. Documents are only ever served as
 * downloads (see AssetController), so nothing in them runs inside the app.
 */
@Component
public class DocumentUploadValidator {

    public static final long MAX_SIZE_BYTES = 10L * 1024 * 1024; // 10 MB

    private enum Signature { PDF, ZIP, OLE, TEXT }

    public record DocumentType(String extension, String contentType) {
    }

    private record Rule(String contentType, Signature signature) {
    }

    private static final Map<String, Rule> RULES = Map.ofEntries(
            Map.entry("pdf", new Rule("application/pdf", Signature.PDF)),
            Map.entry("docx", new Rule("application/vnd.openxmlformats-officedocument.wordprocessingml.document", Signature.ZIP)),
            Map.entry("xlsx", new Rule("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Signature.ZIP)),
            Map.entry("pptx", new Rule("application/vnd.openxmlformats-officedocument.presentationml.presentation", Signature.ZIP)),
            Map.entry("odt", new Rule("application/vnd.oasis.opendocument.text", Signature.ZIP)),
            Map.entry("ods", new Rule("application/vnd.oasis.opendocument.spreadsheet", Signature.ZIP)),
            Map.entry("odp", new Rule("application/vnd.oasis.opendocument.presentation", Signature.ZIP)),
            Map.entry("doc", new Rule("application/msword", Signature.OLE)),
            Map.entry("xls", new Rule("application/vnd.ms-excel", Signature.OLE)),
            Map.entry("ppt", new Rule("application/vnd.ms-powerpoint", Signature.OLE)),
            Map.entry("txt", new Rule("text/plain", Signature.TEXT)),
            Map.entry("csv", new Rule("text/csv", Signature.TEXT)));

    public DocumentType validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ContentValidationException("Aucun fichier reçu");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new ContentValidationException("Fichier trop lourd (max 10 Mo)");
        }
        String extension = extensionOf(file.getOriginalFilename());
        Rule rule = RULES.get(extension);
        if (rule == null) {
            throw new ContentValidationException(
                    "Type de document non supporté (PDF, Word, Excel, PowerPoint, OpenDocument, texte, CSV)");
        }
        if (!matches(rule.signature(), head(file))) {
            throw new ContentValidationException("Le contenu ne correspond pas à un fichier ." + extension + " valide");
        }
        return new DocumentType(extension, rule.contentType());
    }

    static String extensionOf(String filename) {
        String name = StringUtils.getFilename(filename);
        String ext = name == null ? null : StringUtils.getFilenameExtension(name);
        return ext == null ? "" : ext.toLowerCase(Locale.ROOT);
    }

    private static byte[] head(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            return in.readNBytes(8192);
        } catch (IOException e) {
            throw new ContentValidationException("Lecture du fichier impossible");
        }
    }

    private static boolean matches(Signature signature, byte[] h) {
        return switch (signature) {
            case PDF -> startsWith(h, '%', 'P', 'D', 'F', '-');
            case ZIP -> startsWith(h, 'P', 'K', 0x03, 0x04);
            case OLE -> startsWith(h, 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1);
            case TEXT -> isText(h);
        };
    }

    /** Plain text: no NUL byte (binary files almost always contain some). */
    private static boolean isText(byte[] h) {
        for (byte b : h) {
            if (b == 0) {
                return false;
            }
        }
        return true;
    }

    private static boolean startsWith(byte[] data, int... prefix) {
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
