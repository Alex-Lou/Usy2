package com.memocat.asset;

import com.memocat.asset.dto.AssetDto;
import com.memocat.domain.Asset;
import com.memocat.domain.AssetContent;
import com.memocat.domain.User;
import com.memocat.repository.AssetContentRepository;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ContentValidationException;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/**
 * Uploads and serves image assets. Bytes are stored in the database (see
 * {@link AssetContent}) so they survive restarts on hosts with an ephemeral
 * local disk. Validation is centralized in {@link ImageUploadValidator}.
 */
@Service
public class AssetService {

    private final AssetRepository assetRepository;
    private final AssetContentRepository assetContentRepository;
    private final UserRepository userRepository;
    private final ImageUploadValidator imageUploadValidator;

    public AssetService(AssetRepository assetRepository,
                        AssetContentRepository assetContentRepository,
                        UserRepository userRepository,
                        ImageUploadValidator imageUploadValidator) {
        this.assetRepository = assetRepository;
        this.assetContentRepository = assetContentRepository;
        this.userRepository = userRepository;
        this.imageUploadValidator = imageUploadValidator;
    }

    @Transactional
    public AssetDto upload(String username, MultipartFile file) {
        String extension = imageUploadValidator.validate(file);
        User uploader = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ContentValidationException("Could not read uploaded file");
        }

        // Logical key kept unique for the asset row; no longer a filesystem path.
        String key = UUID.randomUUID() + "." + extension;
        String originalName = StringUtils.getFilename(file.getOriginalFilename());
        Asset asset = assetRepository.save(new Asset(
                key,
                originalName != null ? originalName : key,
                file.getContentType(),
                bytes.length,
                uploader));
        assetContentRepository.save(new AssetContent(asset.getId(), bytes));
        return AssetDto.from(asset);
    }

    @Transactional(readOnly = true)
    public ServedFile serve(Long assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found"));
        AssetContent content = assetContentRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset content not found"));
        return new ServedFile(content.getBytes(), asset.getContentType());
    }

    public record ServedFile(byte[] content, String contentType) {
    }
}
