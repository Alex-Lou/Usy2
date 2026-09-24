import { apiRequest } from "../../lib/api/client";
import type { Widget } from "../profile/types";
import type { CoupleOverview, Memory, Mood, Note, Page, SharedList, SharedWidgets } from "./types";

export function getCouple(): Promise<CoupleOverview> {
  return apiRequest<CoupleOverview>("/api/couple");
}

export function setMood(emoji: string, label: string | null): Promise<Mood> {
  return apiRequest<Mood>("/api/couple/mood", { method: "PUT", body: { emoji, label } });
}

export function setTogetherSince(date: string | null): Promise<CoupleOverview> {
  return apiRequest<CoupleOverview>("/api/couple/together-since", { method: "PUT", body: { date } });
}

export function listNotes(page = 0, size = 20): Promise<Page<Note>> {
  return apiRequest<Page<Note>>(`/api/couple/notes?page=${page}&size=${size}`);
}

export function addNote(text: string): Promise<Note> {
  return apiRequest<Note>("/api/couple/notes", { method: "POST", body: { text } });
}

export function deleteNote(id: number): Promise<void> {
  return apiRequest<void>(`/api/couple/notes/${id}`, { method: "DELETE" });
}

export function getMemories(): Promise<Memory[]> {
  return apiRequest<Memory[]>("/api/couple/memories");
}

export function getLists(): Promise<SharedList[]> {
  return apiRequest<SharedList[]>("/api/couple/lists");
}

export function createList(name: string): Promise<SharedList> {
  return apiRequest<SharedList>("/api/couple/lists", { method: "POST", body: { name } });
}

export function renameList(id: number, name: string): Promise<SharedList> {
  return apiRequest<SharedList>(`/api/couple/lists/${id}`, { method: "PATCH", body: { name } });
}

export function deleteList(id: number): Promise<void> {
  return apiRequest<void>(`/api/couple/lists/${id}`, { method: "DELETE" });
}

export function addItem(listId: number, text: string): Promise<SharedList> {
  return apiRequest<SharedList>(`/api/couple/lists/${listId}/items`, { method: "POST", body: { text } });
}

export function clearDone(listId: number): Promise<SharedList> {
  return apiRequest<SharedList>(`/api/couple/lists/${listId}/done-items`, { method: "DELETE" });
}

export function setItemDone(itemId: number, done: boolean): Promise<SharedList> {
  return apiRequest<SharedList>(`/api/couple/list-items/${itemId}`, { method: "PATCH", body: { done } });
}

export function deleteItem(itemId: number): Promise<SharedList> {
  return apiRequest<SharedList>(`/api/couple/list-items/${itemId}`, { method: "DELETE" });
}

export function getSharedWidgets(): Promise<SharedWidgets> {
  return apiRequest<SharedWidgets>("/api/couple/widgets");
}

export function saveSharedWidgets(widgets: Widget[], version: number): Promise<SharedWidgets> {
  return apiRequest<SharedWidgets>("/api/couple/widgets", { method: "PUT", body: { widgets, version } });
}

/** Adds a copy of one widget at the end of the shared list. */
export function addSharedWidget(widget: Widget): Promise<SharedWidgets> {
  return apiRequest<SharedWidgets>("/api/couple/widgets", { method: "POST", body: { widget } });
}
