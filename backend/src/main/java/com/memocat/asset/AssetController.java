package com.memocat.asset;

import com.memocat.asset.dto.AssetDto;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
    public AssetDto upload(Principal principal, @RequestParam("file") MultipartFile file) {
        return assetService.upload(principal.getName(), file);
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> serve(@PathVariable Long id) {
        AssetService.ServedFile served = assetService.serve(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(served.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePrivate())
                .body(served.content());
    }
}
