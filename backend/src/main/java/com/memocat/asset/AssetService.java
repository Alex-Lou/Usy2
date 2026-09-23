package com.memocat.asset;

import com.memocat.asset.dto.AssetDto;
import com.memocat.asset.dto.StorageUsageDto;
import com.memocat.domain.Asset;
import com.memocat.domain.AssetContent;
import com.memocat.domain.User;
import com.memocat.repository.AssetContentRepository;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/**
 * Uploads and serves files (images and documents). Bytes are stored in the
 * database (see {@link AssetContent}) so they survive restarts on hosts with an
 * ephemeral local disk. Validation lives in {@link ImageUploadValidator},
 * {@link DocumentUploadValidator} and {@link AudioUploadValidator}; a storage quota keeps the (small, free)
 * database from filling up.
 */
@Service
public class AssetService {

    private final AssetRepository assetRepository;
    private final AssetContentRepository assetContentRepository;
    private final UserRepository userRepository;
    private final ImageUploadValidator imageUploadValidator;
    private final DocumentUploadValidator documentUploadValidator;
    private final AudioUploadValidator audioUploadValidator;
    private final long quotaBytes;

    public AssetService(AssetRepository assetRepository,
                        AssetContentRepository assetContentRepository,
                        UserRepository userRepository,
                        ImageUploadValidator imageUploadValidator,
                        DocumentUploadValidator documentUploadValidator,
                        AudioUploadValidator audioUploadValidator,
                        @Value("${memocat.storage.quota-mb:800}") long quotaMb) {
        this.assetRepository = assetRepository;
        this.assetContentRepository = assetContentRepository;
        this.userRepository = userRepository;
        this.imageUploadValidator = imageUploadValidator;
        this.documentUploadValidator = documentUploadValidator;
        this.audioUploadValidator = audioUploadValidator;
        this.quotaBytes = quotaMb * 1024 * 1024;
    }

    @Transactional
    public AssetDto upload(String username, MultipartFile file, String effect) {
        String extension = imageUploadValidator.validate(file);
        return store(username, file, file.getOriginalFilename(), extension, file.getContentType(), PhotoEffects.validate(effect));
    }

    @Transactional
    public AssetDto uploadDocument(String username, MultipartFile file) {
        DocumentUploadValidator.DocumentType type = documentUploadValidator.validate(file);
        return store(username, file, file.getOriginalFilename(), type.extension(), type.contentType(), null);
    }

    /** A voice message; stored under a neutral name, whatever the client sent. */
    @Transactional
    public AssetDto uploadAudio(String username, MultipartFile file) {
        AudioUploadValidator.AudioType type = audioUploadValidator.validate(file);
        return store(username, file, "vocal." + type.extension(), type.extension(), type.contentType(), null);
    }

    @Transactional(readOnly = true)
    public StorageUsageDto usage() {
        return new StorageUsageDto(assetRepository.totalSizeBytes(), quotaBytes);
    }

    private AssetDto store(String username, MultipartFile file, String originalName, String extension,
                           String contentType, String effect) {
        User uploader = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (assetRepository.totalSizeBytes() + file.getSize() > quotaBytes) {
            throw new ContentValidationException("Espace de stockage plein : supprime d'anciens fichiers");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ContentValidationException("Could not read uploaded file");
        }

        // Logical key kept unique for the asset row; no longer a filesystem path.
        String key = UUID.randomUUID() + "." + extension;
        Asset asset = assetRepository.save(new Asset(
                key,
                safeName(originalName, key),
                contentType,
                bytes.length,
                uploader));
        asset.setEffect(effect);
        assetContentRepository.save(new AssetContent(asset.getId(), bytes));
        return AssetDto.from(asset);
    }

    /** File name shown and offered on download: no path, no control characters, bounded. */
    static String safeName(String original, String fallback) {
        String name = StringUtils.getFilename(original);
        if (name == null) {
            return fallback;
        }
        name = name.replaceAll("[\\p{Cntrl}\\\\/]", "").strip();
        if (name.length() > 120) {
            String ext = StringUtils.getFilenameExtension(name);
            name = ext == null || ext.length() > 10 ? name.substring(0, 120)
                    : name.substring(0, 119 - ext.length()) + "." + ext;
        }
        return name.isEmpty() ? fallback : name;
    }

    @Transactional(readOnly = true)
    public ServedFile serve(Long assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found"));
        AssetContent content = assetContentRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset content not found"));
        return new ServedFile(content.getBytes(), asset.getContentType(), asset.getOriginalFilename());
    }

    public record ServedFile(byte[] content, String contentType, String filename) {

        /** Only images are shown inline; everything else is a download. */
        public boolean inline() {
            return contentType.startsWith("image/");
        }
    }
}
