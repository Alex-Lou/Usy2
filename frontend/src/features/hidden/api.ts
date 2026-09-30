import { apiRequest } from "../../lib/api/client";

export interface HiddenNote {
  id: number;
  mine: boolean;
  authorName: string;
  text: string | null; // the other one's: null until found
  createdAt: string;
  foundAt: string | null;
}

export function getHiddenNotes(assetId: number): Promise<HiddenNote[]> {
  return apiRequest<HiddenNote[]>(`/api/hidden-notes?assetId=${assetId}`);
}

export function hideNote(assetId: number, text: string): Promise<HiddenNote> {
  return apiRequest<HiddenNote>("/api/hidden-notes", { method: "POST", body: { assetId, text } });
}

export function findNote(id: number): Promise<HiddenNote> {
  return apiRequest<HiddenNote>(`/api/hidden-notes/${id}/find`, { method: "POST" });
}

export function removeNote(id: number): Promise<void> {
  return apiRequest<void>(`/api/hidden-notes/${id}`, { method: "DELETE" });
}
