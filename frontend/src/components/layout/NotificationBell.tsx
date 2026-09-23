import { useEffect, useRef, useState } from "react";
import { useNotifications } from "../../app/notifications";
import { enableSystemNotifications, systemPermission } from "../../features/notifications/systemNotify";
import { Icon } from "../ui/Icon";

function timeLabel(at: number): string {
  const diff = Date.now() - at;
  if (diff < 60_000) return "à l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  return new Date(at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function NotificationBell() {
  const { items, unread, markAllRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(systemPermission);
  const rootRef = useRef<HTMLDivElement>(null);

  async function enableAlerts() {
    setPermission(await enableSystemNotifications());
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    setOpen((o) => {
      if (!o && unread > 0) markAllRead();
      return !o;
    });
  }

  return (
    <div ref={rootRef} className="fixed right-4 top-4 z-40">
      <button
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications (${unread} non lues)` : "Notifications"}
        className="relative grid h-11 w-11 place-items-center rounded-full glass text-text press hover:text-primary"
      >
        <Icon name="bell" size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow-glow animate-pop">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-token border border-border bg-surface shadow-card animate-pop">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="font-display text-sm font-bold">Notifications</span>
            {items.length > 0 && (
              <button onClick={clear} className="text-xs text-text-muted hover:text-danger">
                Effacer
              </button>
            )}
          </div>
          {permission === "default" && (
            <button onClick={enableAlerts} className="flex w-full items-center gap-2 border-b border-border bg-primary/10 px-3 py-2 text-left text-xs font-semibold text-primary press">
              <Icon name="bell" size={14} /> Activer les alertes sur cet appareil
            </button>
          )}
          {permission === "denied" && (
            <p className="border-b border-border px-3 py-2 text-[11px] text-text-muted">
              Alertes bloquées pour ce site : réautorise-les dans les réglages du navigateur.
            </p>
          )}
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">Rien pour l'instant 💤</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="flex flex-col gap-0.5 border-b border-border/60 px-3 py-2.5 last:border-0">
                  <span className="text-sm">{n.text}</span>
                  <span className="text-[11px] text-text-muted">{timeLabel(n.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
