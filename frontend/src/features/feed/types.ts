import type { User } from "../auth/api";

export interface ReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface Post {
  id: number;
  author: User;
  text: string;
  imageAssetId: number | null;
  imageEffect?: string | null; // animated effect from the photo studio
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  reactions: ReactionSummary[];
  commentCount: number;
}

export interface Comment {
  id: number;
  author: User;
  text: string;
  createdAt: string;
  reactions: CommentReaction[]; // one emoji per person, oldest first
}

export interface CommentReaction {
  userId: number;
  emoji: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

