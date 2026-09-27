package com.memocat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Raw bytes of an uploaded {@link Asset}, stored in the database so uploads
 * survive restarts on hosts with an ephemeral local disk. Shares the asset's id
 * as its primary key; kept in its own table so listing asset metadata never
 * loads the blob. Plain {@code byte[]} maps to Postgres {@code bytea}.
 */
@Entity
@Table(name = "asset_content")
public class AssetContent {

    @Id
    @Column(name = "asset_id")
    private Long assetId;

    @Column(nullable = false)
    private byte[] bytes;

    protected AssetContent() {
        // for JPA
    }

    public AssetContent(Long assetId, byte[] bytes) {
        this.assetId = assetId;
        this.bytes = bytes;
    }

    public Long getAssetId() {
        return assetId;
    }

    public byte[] getBytes() {
        return bytes;
    }
}
