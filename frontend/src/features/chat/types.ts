import type { Asset } from "../../lib/api/assets";
import type { User } from "../auth/api";

export interface Message {
  id: number;
  sender: User;
  content: string; // may be empty when an attachment is sent alone
  attachment: Asset | null;
  createdAt: string;
  reactions: MessageReaction[]; // one emoji per person, oldest first
  replyTo: ReplyPreview | null; // the earlier message this one answers
  style?: string | null; // bubble style: "shout" | "whisper" | "shake" (see looks.ts)
  effect?: string | null; // full-screen effect played for both (see looks.ts)
  readAt?: string | null; // when the other one saw it (the "Vu"), null until then
}

/** Broadcast on /topic/chat-read: readerId has seen the other one's messages up to upToId. */
export interface ChatRead {
  readerId: number;
  upToId: number;
  readAt: string;
}

/** Broadcast on /topic/chat-typing while someone types (never stored). */
export interface Typing {
  userId: number;
  name: string;
}

/** The quoted message shown above a reply. */
export interface ReplyPreview {
  id: number;
  senderId: number;
  senderName: string;
  excerpt: string;
  attachment: "image" | "audio" | "file" | null;
}

export interface MessageReaction {
  userId: number;
  emoji: string;
}

/** Broadcast on /topic/message-reactions and returned by reactToMessage. */
export interface MessageReactions {
  messageId: number;
  reactions: MessageReaction[];
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
