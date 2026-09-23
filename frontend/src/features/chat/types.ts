import type { Asset } from "../../lib/api/assets";
import type { User } from "../auth/api";

export interface Message {
  id: number;
  sender: User;
  content: string; // may be empty when an attachment is sent alone
  attachment: Asset | null;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
