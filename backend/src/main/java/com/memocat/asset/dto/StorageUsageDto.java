package com.memocat.asset.dto;

/** How much of the file storage (in the database) is used. */
public record StorageUsageDto(long usedBytes, long quotaBytes) {
}
