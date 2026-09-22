import { apiRequest } from "../../lib/api/client";
import type { Message, Page } from "./types";

export function getHistory(page = 0, size = 30): Promise<Page<Message>> {
  return apiRequest<Page<Message>>(`/api/messages?page=${page}&size=${size}`);
}
