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

/**
 * Makes one photo my avatar or my profile cover, keeping the rest of the
 * profile as it is. The new photo starts centred (framing reset).
 */
export async function setProfilePhoto(kind: "avatar" | "cover", assetId: number): Promise<Profile> {
  const p = await getMyProfile();
  const avatar = kind === "avatar";
  return updateMyProfile(
    p.theme,
    p.widgets,
    avatar ? assetId : (p.avatarAssetId ?? null),
    p.bio ?? null,
    avatar ? (p.coverAssetId ?? null) : assetId,
    avatar ? null : (p.avatarFraming ?? null),
    avatar ? (p.coverFraming ?? null) : null,
  );
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
