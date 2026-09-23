import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface Notif {
  id: string;
  text: string;
  at: number; // epoch ms
  read: boolean;
  url?: string; // in-app page it opens (e.g. /posts/12)
}

const KEY = "memocat.notifs";
const MAX = 20;

function readInitial(): Notif[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (JSON.parse(raw) as Notif[]).slice(0, MAX);
  } catch {
    /* ignore */
  }
  return [];
}

function persist(items: Notif[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

interface NotificationsValue {
  items: Notif[];
  unread: number;
  add: (text: string, url?: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notif[]>(readInitial);

  const add = useCallback((text: string, url?: string) => {
    setItems((prev) => {
      const next = [
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, at: Date.now(), read: false, url },
        ...prev,
      ].slice(0, MAX);
      persist(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((n) => (n.read ? n : { ...n, read: true }));
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    persist([]);
  }, []);

  const unread = items.reduce((n, it) => n + (it.read ? 0 : 1), 0);
  const value = useMemo(() => ({ items, unread, add, markAllRead, clear }), [items, unread, add, markAllRead, clear]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
