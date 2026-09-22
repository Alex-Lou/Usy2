package com.memocat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "memocat.jwt")
public class JwtProperties {

    /** Signing secret; must be at least 32 chars (256 bits) for HS256. */
    private String secret;

    /** Access token lifetime in minutes. */
    private long expirationMinutes = 1440;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getExpirationMinutes() {
        return expirationMinutes;
    }

    public void setExpirationMinutes(long expirationMinutes) {
        this.expirationMinutes = expirationMinutes;
    }
}
