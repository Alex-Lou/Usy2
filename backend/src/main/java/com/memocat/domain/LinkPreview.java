package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** A cached preview of a web page (see LinkPreviewService). */
@Entity
@Table(name = "link_preview")
public class LinkPreview {

    @Id
    private String url;

    @Column
    private String title;

    @Column
    private String description;

    @Column(name = "site_name")
    private String siteName;

    @Column
    private byte[] image;

    @Column(name = "image_type")
    private String imageType;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    protected LinkPreview() {
        // for JPA
    }

    public LinkPreview(String url, String title, String description, String siteName,
                       byte[] image, String imageType, Instant fetchedAt) {
        this.url = url;
        this.title = title;
        this.description = description;
        this.siteName = siteName;
        this.image = image;
        this.imageType = imageType;
        this.fetchedAt = fetchedAt;
    }

    public String getUrl() {
        return url;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getSiteName() {
        return siteName;
    }

    public byte[] getImage() {
        return image;
    }

    public String getImageType() {
        return imageType;
    }

    public Instant getFetchedAt() {
        return fetchedAt;
    }
}
