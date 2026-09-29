import { useEffect, useSyncExternalStore } from "react";
import { apiRequest } from "../../lib/api/client";

/**
 * How many of the other one's messages I have not seen yet: the red bubble on
 * the Messages tab. The server counts; this refreshes when a message
 * notification arrives, when I read the chat, and when the app comes back.
 */
let count = 0;
const listeners = new Set<() => void>();

function set(next: number) {
  if (next === count) return;
  count = next;
  listeners.forEach((l) => l());
}

export function refreshUnread(): void {
  apiRequest<{ count: number }>("/api/messages/unread")
    .then((r) => set(r.count))
    .catch(() => {
      /* offline: keep the last count */
    });
}

export function useUnreadMessages(): number {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => count,
  );
  useEffect(() => {
    refreshUnread();
    const onVisible = () => document.visibilityState === "visible" && refreshUnread();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return value;
}
