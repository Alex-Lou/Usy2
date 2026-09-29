import { apiRequest } from "../../lib/api/client";

export type SearchKind = "message" | "post" | "comment" | "photo" | "album" | "note";

export interface SearchHit {
  kind: SearchKind;
  id: number;
  text: string | null;
  createdAt: string;
  authorName: string;
  assetId: number | null;
  link: string;
}

/** A word or a date (12/03/2025, 12/03, mars 2025): at most 20 results of each kind. */
export function search(q: string): Promise<SearchHit[]> {
  return apiRequest<SearchHit[]>(`/api/search?q=${encodeURIComponent(q)}`);
}
