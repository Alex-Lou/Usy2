package com.memocat.asset;

import com.memocat.config.StorageProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/**
 * Stores and reads uploaded files on the local filesystem. Storage keys are
 * generated (UUID), never derived from user input, so path traversal is not
 * possible. Reads are constrained to the storage root.
 */
@Service
public class StorageService {

    private final Path root;

    public StorageService(StorageProperties properties) {
        this.root = Path.of(properties.getPath()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create storage directory: " + root, e);
        }
    }

    /** Writes the file under a freshly generated key and returns that key. */
    public String store(MultipartFile file, String extension) {
        String key = UUID.randomUUID() + "." + extension;
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalStateException("Resolved path escapes storage root");
        }
        try {
            file.transferTo(target);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store file", e);
        }
        return key;
    }

    public byte[] read(String storageKey) {
        Path target = root.resolve(storageKey).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalStateException("Resolved path escapes storage root");
        }
        try {
            return Files.readAllBytes(target);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read file", e);
        }
    }
}
