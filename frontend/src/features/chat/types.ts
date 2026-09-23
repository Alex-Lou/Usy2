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
