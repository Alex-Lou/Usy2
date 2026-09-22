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
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Asset {
  id: number;
  contentType: string;
  sizeBytes: number;
  originalFilename: string;
}
