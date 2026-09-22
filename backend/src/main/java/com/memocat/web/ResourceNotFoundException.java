package com.memocat.web;

/** Thrown when a requested resource does not exist (-> 404). */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
