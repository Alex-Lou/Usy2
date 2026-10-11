import { apiRequest } from "../../lib/api/client";
import type { Comment, CommentReaction, Page, Post } from "./types";

export function listPosts(page = 0, size = 10): Promise<Page<Post>> {
  return apiRequest<Page<Post>>(`/api/posts?page=${page}&size=${size}`);
}

/** Where the photos also go: an existing album, or a new one of that title. */
export type AlbumChoice = { albumId: number } | { newAlbumTitle: string };

/**
 * {@code imageAssetIds}: the photos, in order (up to 10); {@code album}: they also go into that album
 * and the post links to it (all done at once by the server).
 */
export function createPost(text: string, imageAssetIds: number[], album: AlbumChoice | null = null): Promise<Post> {
  return apiRequest<Post>("/api/posts", {
    method: "POST",
    body: { text, imageAssetIds, ...album },
  });
}

export function updatePost(id: number, text: string, imageAssetIds: number[]): Promise<Post> {
  return apiRequest<Post>(`/api/posts/${id}`, {
    method: "PUT",
    body: { text, imageAssetIds },
  });
}

export function deletePost(id: number): Promise<void> {
  return apiRequest<void>(`/api/posts/${id}`, { method: "DELETE" });
}

export function react(postId: number, emoji: string): Promise<Post> {
  return apiRequest<Post>(`/api/posts/${postId}/reactions`, {
    method: "PUT",
    body: { emoji },
  });
}

export function unreact(postId: number, emoji: string): Promise<Post> {
  return apiRequest<Post>(
    `/api/posts/${postId}/reactions?emoji=${encodeURIComponent(emoji)}`,
    { method: "DELETE" },
  );
}

export function listComments(postId: number, page = 0, size = 20): Promise<Page<Comment>> {
  return apiRequest<Page<Comment>>(`/api/posts/${postId}/comments?page=${page}&size=${size}`);
}

/**
 * {@code parentId}: the comment it answers (a reply to a reply joins the same thread);
 * {@code imageAssetId}: a photo or GIF sent with it.
 */
export function addComment(postId: number, text: string, parentId: number | null = null, imageAssetId: number | null = null): Promise<Comment> {
  return apiRequest<Comment>(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: { text, parentId, imageAssetId },
  });
}

export function deleteComment(id: number): Promise<void> {
  return apiRequest<void>(`/api/comments/${id}`, { method: "DELETE" });
}

export function getReactionEmojis(): Promise<string[]> {
  return apiRequest<string[]>("/api/reactions/emojis");
}

/** Sets my emoji on a comment; the same emoji again (or null) removes it. */
export function reactToComment(commentId: number, emoji: string | null): Promise<{ commentId: number; reactions: CommentReaction[] }> {
  return apiRequest(`/api/comments/${commentId}/reaction`, { method: "PUT", body: { emoji } });
}

/** One post (e.g. opened from a notification). */
export function getPost(id: number): Promise<Post> {
  return apiRequest<Post>(`/api/posts/${id}`);
}
