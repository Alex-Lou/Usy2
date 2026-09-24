package com.memocat.web;

/** The data changed since the client read it (HTTP 409): reload, then retry. */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
