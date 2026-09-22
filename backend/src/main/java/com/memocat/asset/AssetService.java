package com.memocat.asset;

import com.memocat.asset.dto.AssetDto;
import com.memocat.domain.Asset;
import com.memocat.domain.User;
import com.memocat.repository.AssetRepository;
import com.memocat.repository.UserRepository;
import com.memocat.web.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AssetService {

    private final AssetRepository assetRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final ImageUploadValidator imageUploadValidator;

    public AssetService(AssetRepository assetRepository,
                        UserRepository userRepository,
                        StorageService storageService,
                        ImageUploadValidator imageUploadValidator) {
        this.assetRepository = assetRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.imageUploadValidator = imageUploadValidator;
    }

    @Transactional
    public AssetDto upload(String username, MultipartFile file) {
        String extension = imageUploadValidator.validate(file);
        User uploader = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String key = storageService.store(file, extension);
        String originalName = StringUtils.getFilename(file.getOriginalFilename());
        Asset asset = new Asset(
                key,
                originalName != null ? originalName : key,
                file.getContentType(),
                file.getSize(),
                uploader);
        return AssetDto.from(assetRepository.save(asset));
    }

    @Transactional(readOnly = true)
    public ServedFile serve(Long assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found"));
        byte[] content = storageService.read(asset.getStorageKey());
        return new ServedFile(content, asset.getContentType());
    }

    public record ServedFile(byte[] content, String contentType) {
    }
}
