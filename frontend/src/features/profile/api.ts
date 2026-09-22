import { apiRequest, uploadFile } from "../../lib/api/client";
import type { Profile, Theme, Widget } from "./types";

export interface UploadedAsset {
  id: number;
}

/** Uploads an image and returns its asset id (used by the image widget). */
export function uploadWidgetImage(file: File): Promise<UploadedAsset> {
  return uploadFile<UploadedAsset>("/api/assets", file);
}

export function getMyProfile(): Promise<Profile> {
  return apiRequest<Profile>("/api/profiles/me");
}

export function getProfile(userId: number): Promise<Profile> {
  return apiRequest<Profile>(`/api/profiles/${userId}`);
}

export function updateMyProfile(theme: Theme, widgets: Widget[]): Promise<Profile> {
  return apiRequest<Profile>("/api/profiles/me", {
    method: "PUT",
    body: { theme, widgets },
  });
}
