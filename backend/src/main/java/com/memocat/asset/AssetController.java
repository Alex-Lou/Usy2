package com.memocat.asset;

import com.memocat.asset.dto.AssetDto;
import com.memocat.asset.dto.StorageUsageDto;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Duration;

@RestController
@RequestMapping("/api/assets")
public class AssetController {

    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @PostMapping
    public AssetDto upload(Principal principal, @RequestParam("file") MultipartFile file,
                           @RequestParam(value = "effect", required = false) String effect) {
        return assetService.upload(principal.getName(), file, effect);
    }

    @PostMapping("/documents")
    public AssetDto uploadDocument(Principal principal, @RequestParam("file") MultipartFile file) {
        return assetService.uploadDocument(principal.getName(), file);
    }

    @GetMapping("/usage")
    public StorageUsageDto usage() {
        return assetService.usage();
    }

    /**
     * Images are shown inline. Documents are always downloads, sandboxed in
     * case one is opened directly, so their content can never run in the app.
     */
    @GetMapping("/{id}")
    public ResponseEntity<byte[]> serve(@PathVariable Long id) {
        AssetService.ServedFile served = assetService.serve(id);
        ResponseEntity.BodyBuilder response = ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(served.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePrivate());
        if (!served.inline()) {
            response.header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                            .filename(served.filename(), StandardCharsets.UTF_8).build().toString())
                    .header("Content-Security-Policy", "sandbox");
        }
        return response.body(served.content());
    }
}
