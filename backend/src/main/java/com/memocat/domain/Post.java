package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "post")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false)
    private String text;

    /** The first photo (see {@link #photos}): kept for previews, memories, search and « Notre année ». */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "image_asset_id")
    private Asset imageAsset;

    /** The post's photos, in order (a carousel); none for a text post. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "post_photo", joinColumns = @JoinColumn(name = "post_id"),
            inverseJoinColumns = @JoinColumn(name = "asset_id"))
    @OrderColumn(name = "position")
    private List<Asset> photos = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(nullable = false)
    private boolean edited;

    protected Post() {
        // for JPA
    }

    public Post(User author, String text, List<Asset> photos) {
        this.author = author;
        this.text = text;
        setPhotos(photos);
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public User getAuthor() {
        return author;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Asset getImageAsset() {
        return imageAsset;
    }

    public List<Asset> getPhotos() {
        return photos;
    }

    /** The photos, in order; the first one is also the post's {@link #getImageAsset() image}. */
    public void setPhotos(List<Asset> photos) {
        this.photos = photos == null ? new ArrayList<>() : new ArrayList<>(photos);
        this.imageAsset = this.photos.isEmpty() ? null : this.photos.get(0);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean isEdited() {
        return edited;
    }

    public void setEdited(boolean edited) {
        this.edited = edited;
    }
}
