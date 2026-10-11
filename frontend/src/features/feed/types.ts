import type { User } from "../auth/api";

export interface ReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

/** A photo (or GIF) of a post or a comment; its size gives its frame the right shape before it loads. */
export interface Photo {
  assetId: number;
  width?: number | null;
  height?: number | null;
  effect?: string | null; // animated effect from the photo studio
  contentType?: string; // image/gif, image/jpeg…
}

/** The name a photo is saved under (« memocat-12-2.gif »). */
export function photoName(base: string, p: Photo): string {
  return `${base}.${p.contentType === "image/gif" ? "gif" : p.contentType === "image/png" ? "png" : "jpg"}`;
}

export interface Post {
  id: number;
  author: User;
  text: string;
  imageAssetId: number | null;
  imageWidth?: number | null; // the photo's size, so its frame has the right shape before it loads
  imageHeight?: number | null;
  imageEffect?: string | null; // animated effect from the photo studio
  photos?: Photo[]; // all the photos, in order (a carousel); the first one is imageAssetId
  albumId?: number | null; // the album its photos were also put in (« Voir l'album »)
  albumTitle?: string | null;
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
  parentId?: number | null; // the top-level comment it answers
  image?: Photo | null; // a photo or GIF with (or instead of) the text
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

