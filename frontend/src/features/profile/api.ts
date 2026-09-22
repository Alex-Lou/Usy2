import { apiRequest, uploadFile } from "../../lib/api/client";
import type { Profile, Theme, Widget } from "./types";

export interface UploadedAsset {
  id: number;
}

/** Uploads an image and returns its asset id (widgets, avatar…). */
export function uploadWidgetImage(file: File): Promise<UploadedAsset> {
  return uploadFile<UploadedAsset>("/api/assets", file);
}

export function getMyProfile(): Promise<Profile> {
  return apiRequest<Profile>("/api/profiles/me");
}

export function getProfile(userId: number): Promise<Profile> {
  return apiRequest<Profile>(`/api/profiles/${userId}`);
}

/** Both members' profiles — used by the home "us" strip. */
export function getAllProfiles(): Promise<Profile[]> {
  return apiRequest<Profile[]>("/api/profiles");
}

export function updateMyProfile(
  theme: Theme,
  widgets: Widget[],
  avatarAssetId: number | null,
  bio: string | null,
): Promise<Profile> {
  return apiRequest<Profile>("/api/profiles/me", {
    method: "PUT",
    body: { theme, widgets, avatarAssetId, bio },
  });
}

export function updateCompanion(companion: string): Promise<Profile> {
  return apiRequest<Profile>("/api/profiles/me/companion", {
    method: "PUT",
    body: { companion },
  });
}
