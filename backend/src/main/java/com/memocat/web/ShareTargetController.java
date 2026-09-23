package com.memocat.web;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * Android's "Share to MemoCat" posts to /share-target. The app's service
 * worker normally answers it (and keeps the shared content); this only
 * catches the rare case where it is not active yet, so the user lands in the
 * app instead of an error page. Nothing is read or stored here.
 */
@RestController
public class ShareTargetController {

    @PostMapping("/share-target")
    public ResponseEntity<Void> shareTarget() {
        return ResponseEntity.status(HttpStatus.SEE_OTHER).header(HttpHeaders.LOCATION, URI.create("/").toString()).build();
    }
}
