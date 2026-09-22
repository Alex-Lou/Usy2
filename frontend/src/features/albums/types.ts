import type { User } from "../auth/api";

export interface Album {
  id: number;
  title: string;
  description: string | null;
  creator: User;
  createdAt: string;
  photoCount: number;
  coverAssetId: number | null;
}

export interface Photo {
  id: number;
  assetId: number;
  caption: string | null;
  position: number;
  uploader: User;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
