import type { Asset } from "./assets";
import { apiRequest } from "./client";

/** A GIF of the search (GIPHY): its small preview, shown straight from GIPHY. */
export interface Gif {
  id: string;
  title: string;
  preview: string;
  width: number;
  height: number;
}

/** {@code next}: the offset of the next page, or null when there is none. */
export interface GifPage {
  gifs: Gif[];
  next: number | null;
}

/** Whether the server has a GIPHY key (without one, only the phone's GIFs). */
export function getGifStatus(): Promise<{ enabled: boolean }> {
  return apiRequest<{ enabled: boolean }>("/api/gifs/status");
}

/** Trending GIFs (empty query) or the ones matching a search, from {@code offset}. */
export function findGifs(query: string, offset = 0): Promise<GifPage> {
  return apiRequest<GifPage>(`/api/gifs?q=${encodeURIComponent(query)}&offset=${offset}`);
}

/** The GIF picked, fetched and kept by the server as one of our images: send it like a photo. */
export function saveGif(id: string): Promise<Asset> {
  return apiRequest<Asset>(`/api/gifs/${encodeURIComponent(id)}`, { method: "POST" });
}
