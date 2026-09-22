package com.memocat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "memocat.storage")
public class StorageProperties {

    /** Local filesystem root for uploaded assets. */
    private String path = "./data/uploads";

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }
}
