import { compressImage } from "../image/compress";
import { uploadFile } from "./client";

export interface Asset {
  id: number;
  contentType: string;
  sizeBytes: number;
  originalFilename: string;
}

/**
 * Single entry point for every image upload (feed, albums, avatar, widgets):
 * the photo is compressed on the device first, then sent to the API.
 */
export async function uploadImage(file: File): Promise<Asset> {
  return uploadFile<Asset>("/api/assets", await compressImage(file));
}
