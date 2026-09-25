package com.memocat.web;

/** Thrown when user-supplied profile content fails allowlist validation (-> 400). */
public class ContentValidationException extends RuntimeException {
    public ContentValidationException(String message) {
        super(message);
    }
}
