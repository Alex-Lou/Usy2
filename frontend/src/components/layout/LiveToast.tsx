import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { NotificationEntry } from "../../features/notifications/api";
import { onToast } from "../../features/notifications/liveToast";
import { Icon } from "../ui/Icon";

const SHOW_MS = 5000;

/**
 * A new notification while the app is open: a banner slides in at the top
 * (the newest replaces the previous one), a tap opens its page, it leaves by
 * itself after a few seconds. Sound and buzz follow « Sons et vibrations »
 * (see NotificationsListener); the phone's own notifications are untouched.
 */
export function LiveToast() {
  const [shown, setShown] = useState<NotificationEntry | null>(null);
  const navigate = useNavigate();

  useEffect(() => onToast(setShown), []);

  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(() => setShown(null), SHOW_MS);
    return () => window.clearTimeout(t);
  }, [shown]);

  if (!shown) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+0.75rem)] z-[60] flex justify-center px-4 lg:top-4" role="status" aria-live="polite">
      <div key={shown.id} className="pointer-events-auto flex w-full max-w-md items-start gap-1 rounded-token border border-border bg-surface shadow-card animate-pop">
        <button
          type="button"
          onClick={() => {
            setShown(null);
            if (/^\/(?!\/)/.test(shown.url)) navigate(shown.url); // in-app pages only
          }}
          className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3 text-left press"
        >
          <span className="truncate text-sm font-semibold text-text">{shown.text}</span>
          {shown.excerpt && <span className="line-clamp-2 break-words text-xs text-text-muted">{shown.excerpt}</span>}
        </button>
        <button type="button" onClick={() => setShown(null)} aria-label="Fermer" className="m-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-muted press hover:text-text">
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  );
}
