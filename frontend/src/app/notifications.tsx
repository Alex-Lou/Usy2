import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../features/auth/useAuth";
import {
  clearNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationEntry,
} from "../features/notifications/api";

/**
 * The bell. Its entries live on the server (the same on every device, and
 * including what arrived while the app was closed); this only mirrors them.
 * NotificationsListener calls reload() when a new one comes in live.
 */
interface NotificationsValue {
  items: NotificationEntry[];
  unread: number;
  reload: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationEntry[]>([]);
  const [unread, setUnread] = useState(0);

  const reload = useCallback(async () => {
    try {
      const list = await listNotifications();
      setItems(list.items);
      setUnread(list.unread);
    } catch {
      /* offline: keep what is shown */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem("memocat.notifs"); // the old bell, kept on each device
    } catch {
      /* ignore */
    }
    if (!user) {
      setItems([]);
      setUnread(0);
      return;
    }
    void reload();
    // Back from the background: what came in meanwhile (the live connection may have slept).
    const onVisible = () => document.visibilityState === "visible" && void reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, reload]);

  const markRead = useCallback(
    async (id: number) => {
      await markNotificationRead(id).catch(() => {});
      await reload();
    },
    [reload],
  );

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
    setUnread(0);
    markAllNotificationsRead().catch(() => void reload());
  }, [reload]);

  const clear = useCallback(() => {
    setItems([]);
    setUnread(0);
    clearNotifications().catch(() => void reload());
  }, [reload]);

  const value = useMemo(() => ({ items, unread, reload, markRead, markAllRead, clear }), [items, unread, reload, markRead, markAllRead, clear]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
