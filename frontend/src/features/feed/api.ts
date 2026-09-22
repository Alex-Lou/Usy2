import { apiRequest, uploadFile } from "../../lib/api/client";
import type { Asset, Comment, Page, Post } from "./types";

export function listPosts(page = 0, size = 10): Promise<Page<Post>> {
  return apiRequest<Page<Post>>(`/api/posts?page=${page}&size=${size}`);
}

export function createPost(text: string, imageAssetId: number | null): Promise<Post> {
  return apiRequest<Post>("/api/posts", {
    method: "POST",
    body: { text, imageAssetId },
  });
}

export function updatePost(id: number, text: string, imageAssetId: number | null): Promise<Post> {
  return apiRequest<Post>(`/api/posts/${id}`, {
    method: "PUT",
    body: { text, imageAssetId },
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

export function addComment(postId: number, text: string): Promise<Comment> {
  return apiRequest<Comment>(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: { text },
  });
}

export function deleteComment(id: number): Promise<void> {
  return apiRequest<void>(`/api/comments/${id}`, { method: "DELETE" });
}

export function uploadImage(file: File): Promise<Asset> {
  return uploadFile<Asset>("/api/assets", file);
}

export function getReactionEmojis(): Promise<string[]> {
  return apiRequest<string[]>("/api/reactions/emojis");
}
