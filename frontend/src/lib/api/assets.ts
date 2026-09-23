import { compressImage } from "../image/compress";
import { apiRequest, uploadFile } from "./client";

export interface Asset {
  id: number;
  contentType: string;
  sizeBytes: number;
  originalFilename: string;
  effect?: string | null; // animated effect of a studio photo
}

/**
 * Single entry point for every image upload (feed, albums, avatar, widgets):
 * the photo is compressed on the device first, then sent to the API.
 */
export async function uploadImage(file: File, effect: string | null = null): Promise<Asset> {
  const query = effect ? `?effect=${encodeURIComponent(effect)}` : "";
  return uploadFile<Asset>(`/api/assets${query}`, await compressImage(file));
}

/** PDF, office or text file (max 10 MB), stored as-is. */
export function uploadDocument(file: File): Promise<Asset> {
  return uploadFile<Asset>("/api/assets/documents", file);
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
}

/** Files live in the database: how full it is. */
export function getStorageUsage(): Promise<StorageUsage> {
  return apiRequest<StorageUsage>("/api/assets/usage");
}
