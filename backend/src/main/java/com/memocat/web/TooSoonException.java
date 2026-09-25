package com.memocat.web;

/** The same action was just done: wait a little before doing it again (HTTP 429). */
public class TooSoonException extends RuntimeException {

    public TooSoonException(String message) {
        super(message);
    }
}
