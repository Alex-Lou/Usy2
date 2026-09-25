import { apiRequest } from "../../lib/api/client";
import type { Framing } from "../../lib/framing";
import type { Glass, Profile, SidebarPrefs, Theme, Widget } from "./types";

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
  coverAssetId: number | null = null,
  avatarFraming: Framing | null = null,
  coverFraming: Framing | null = null,
): Promise<Profile> {
  return apiRequest<Profile>("/api/profiles/me", {
    method: "PUT",
    body: { theme, widgets, avatarAssetId, bio, coverAssetId, avatarFraming, coverFraming },
  });
}

/** My glass choice (null: back to the default). */
export function updateGlass(glass: Glass | null): Promise<Profile> {
  return apiRequest<Profile>("/api/profiles/me/glass", { method: "PUT", body: { glass } });
}

/** My side menu choices (see features/couple/sidebar.ts). */
export function updateSidebar(prefs: SidebarPrefs): Promise<Profile> {
  return apiRequest<Profile>("/api/profiles/me/sidebar", { method: "PUT", body: prefs });
}

export function updateCompanion(companion: string): Promise<Profile> {
  return apiRequest<Profile>("/api/profiles/me/companion", {
    method: "PUT",
    body: { companion },
  });
}
