package com.memocat.web;

/** Thrown when the authenticated user may not act on a resource (-> 403). */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
