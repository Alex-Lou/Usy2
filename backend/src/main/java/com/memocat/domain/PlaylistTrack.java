package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/** One song of a playlist: a name, and optionally a web link (opened in Patotube). */
@Entity
@Table(name = "playlist_track")
public class PlaylistTrack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "playlist_id", nullable = false, updatable = false)
    private Playlist playlist;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private String title;

    @Column
    private String artist;

    @Column
    private String url;

    @Column
    private String note;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "added_by_id", nullable = false, updatable = false)
    private User addedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected PlaylistTrack() {
        // for JPA
    }

    public PlaylistTrack(Playlist playlist, int position, User addedBy) {
        this.playlist = playlist;
        this.position = position;
        this.addedBy = addedBy;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public void edit(String title, String artist, String url, String note) {
        this.title = title;
        this.artist = artist;
        this.url = url;
        this.note = note;
    }

    public Long getId() {
        return id;
    }

    public Playlist getPlaylist() {
        return playlist;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public String getTitle() {
        return title;
    }

    public String getArtist() {
        return artist;
    }

    public String getUrl() {
        return url;
    }

    public String getNote() {
        return note;
    }

    public User getAddedBy() {
        return addedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
