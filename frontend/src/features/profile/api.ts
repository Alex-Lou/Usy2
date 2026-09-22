import { apiRequest } from "../../lib/api/client";
import type { Profile, Theme, Widget } from "./types";

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
