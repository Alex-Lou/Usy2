import type { User } from "../auth/api";

export interface Message {
  id: number;
  sender: User;
  content: string;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
