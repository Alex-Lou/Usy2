import { apiRequest } from "../../lib/api/client";
import type { Playlist, TrackInput } from "./types";

export function getPlaylists(): Promise<Playlist[]> {
  return apiRequest<Playlist[]>("/api/music/playlists");
}

export function createPlaylist(name: string, emoji: string | null): Promise<Playlist> {
  return apiRequest<Playlist>("/api/music/playlists", { method: "POST", body: { name, emoji } });
}

export function renamePlaylist(id: number, name: string, emoji: string | null): Promise<Playlist> {
  return apiRequest<Playlist>(`/api/music/playlists/${id}`, { method: "PATCH", body: { name, emoji } });
}

export function deletePlaylist(id: number): Promise<void> {
  return apiRequest<void>(`/api/music/playlists/${id}`, { method: "DELETE" });
}

export function addTrack(playlistId: number, input: TrackInput): Promise<Playlist> {
  return apiRequest<Playlist>(`/api/music/playlists/${playlistId}/tracks`, { method: "POST", body: input });
}

export function updateTrack(trackId: number, input: TrackInput): Promise<Playlist> {
  return apiRequest<Playlist>(`/api/music/tracks/${trackId}`, { method: "PUT", body: input });
}

export function deleteTrack(trackId: number): Promise<Playlist> {
  return apiRequest<Playlist>(`/api/music/tracks/${trackId}`, { method: "DELETE" });
}

/** Every track of the playlist, in the new order. */
export function reorderTracks(playlistId: number, trackIds: number[]): Promise<Playlist> {
  return apiRequest<Playlist>(`/api/music/playlists/${playlistId}/order`, { method: "PUT", body: { trackIds } });
}
