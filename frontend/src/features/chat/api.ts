import { apiRequest } from "../../lib/api/client";
import type { Message, MessageReactions, Page } from "./types";

export function getHistory(page = 0, size = 30): Promise<Page<Message>> {
  return apiRequest<Page<Message>>(`/api/messages?page=${page}&size=${size}`);
}

/** Sets my emoji on a message; the same emoji again (or null) removes it. */
export function reactToMessage(messageId: number, emoji: string | null): Promise<MessageReactions> {
  return apiRequest<MessageReactions>(`/api/messages/${messageId}/reaction`, { method: "PUT", body: { emoji } });
}

/** Rewrites one of my messages; both screens get the new version live (/topic/message-edited). */
export function editMessage(messageId: number, content: string): Promise<Message> {
  return apiRequest<Message>(`/api/messages/${messageId}`, { method: "PUT", body: { content } });
}
