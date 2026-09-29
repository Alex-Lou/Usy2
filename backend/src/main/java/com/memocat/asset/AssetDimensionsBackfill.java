package com.memocat.asset;

import com.memocat.repository.AssetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * At startup, records the size of images uploaded before sizes were stored
 * (one at a time, header only). Nothing left to do after the first run; an
 * image whose header cannot be read is simply retried on the next start.
 * Never blocks startup: a failure is logged and skipped.
 */
@Component
public class AssetDimensionsBackfill implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AssetDimensionsBackfill.class);

    private final AssetRepository assetRepository;
    private final AssetService assetService;

    public AssetDimensionsBackfill(AssetRepository assetRepository, AssetService assetService) {
        this.assetRepository = assetRepository;
        this.assetService = assetService;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<Long> ids = assetRepository.findImageIdsWithoutDimensions();
        if (ids.isEmpty()) {
            return;
        }
        int failed = 0;
        for (Long id : ids) {
            try {
                assetService.fillDimensions(id);
            } catch (RuntimeException e) {
                failed++;
                log.warn("Could not read the size of image asset {}: {}", id, e.getMessage());
            }
        }
        log.info("Image sizes: {} checked, {} failed.", ids.size(), failed);
    }
}
