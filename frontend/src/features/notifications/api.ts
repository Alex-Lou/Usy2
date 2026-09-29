import { apiRequest } from "../../lib/api/client";

/** A bell entry, as the server keeps it (see NotificationService). */
export interface NotificationEntry {
  id: number;
  recipientId: number;
  text: string;
  excerpt: string | null;
  url: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: NotificationEntry[];
  unread: number;
}

export function listNotifications(): Promise<NotificationList> {
  return apiRequest<NotificationList>("/api/notifications");
}

export function markAllNotificationsRead(): Promise<void> {
  return apiRequest<void>("/api/notifications/read", { method: "POST" });
}

export function markNotificationRead(id: number): Promise<void> {
  return apiRequest<void>(`/api/notifications/${id}/read`, { method: "POST" });
}

export function clearNotifications(): Promise<void> {
  return apiRequest<void>("/api/notifications", { method: "DELETE" });
}
