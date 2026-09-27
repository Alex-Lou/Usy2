import { apiRequest } from "../../lib/api/client";
import type { Framing } from "../../lib/framing";
import type { Album, Page, Photo } from "./types";

export function listAlbums(page = 0, size = 12): Promise<Page<Album>> {
  return apiRequest<Page<Album>>(`/api/albums?page=${page}&size=${size}`);
}

export function createAlbum(title: string, description: string | null): Promise<Album> {
  return apiRequest<Album>("/api/albums", { method: "POST", body: { title, description } });
}

export function getAlbum(id: number): Promise<Album> {
  return apiRequest<Album>(`/api/albums/${id}`);
}

export function updateAlbum(id: number, title: string, description: string | null): Promise<Album> {
  return apiRequest<Album>(`/api/albums/${id}`, { method: "PUT", body: { title, description } });
}

export function deleteAlbum(id: number): Promise<void> {
  return apiRequest<void>(`/api/albums/${id}`, { method: "DELETE" });
}

export function listPhotos(albumId: number, page = 0, size = 100): Promise<Page<Photo>> {
  return apiRequest<Page<Photo>>(`/api/albums/${albumId}/photos?page=${page}&size=${size}`);
}

export function addPhoto(albumId: number, assetId: number, caption: string | null): Promise<Photo> {
  return apiRequest<Photo>(`/api/albums/${albumId}/photos`, {
    method: "POST",
    body: { assetId, caption },
  });
}

export function updatePhotoCaption(albumId: number, photoId: number, caption: string): Promise<Photo> {
  return apiRequest<Photo>(`/api/albums/${albumId}/photos/${photoId}`, {
    method: "PUT",
    body: { caption },
  });
}

export function deletePhoto(albumId: number, photoId: number): Promise<void> {
  return apiRequest<void>(`/api/albums/${albumId}/photos/${photoId}`, { method: "DELETE" });
}

export function reorderPhotos(albumId: number, photoIds: number[]): Promise<void> {
  return apiRequest<void>(`/api/albums/${albumId}/photos/order`, {
    method: "PUT",
    body: { photoIds },
  });
}

/** Picks the album's cover among its photos; null goes back to the first photo. */
export function setAlbumCover(albumId: number, photoId: number | null, framing: Framing | null = null): Promise<Album> {
  return apiRequest<Album>(`/api/albums/${albumId}/cover`, { method: "PUT", body: { photoId, framing } });
}
