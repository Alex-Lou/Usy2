import type { NotificationEntry } from "./api";

// Tiny in-app bus: the listener hands a new notification to the banner (LiveToast).
const EVENT = "memocat:live-toast";

export function emitToast(n: NotificationEntry): void {
  window.dispatchEvent(new CustomEvent<NotificationEntry>(EVENT, { detail: n }));
}

export function onToast(listener: (n: NotificationEntry) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<NotificationEntry>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
