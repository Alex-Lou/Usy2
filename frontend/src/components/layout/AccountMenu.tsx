import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../ui/Icon";
import { ThemeToggle } from "./ThemeToggle";

const LINKS: { to: string; label: string; emoji: string }[] = [
  { to: "/profile/moi", label: "Mon profil", emoji: "🙋" },
  { to: "/profile/nous", label: "Notre profil", emoji: "💑" },
  { to: "/profile/barre", label: "Ma barre latérale", emoji: "🧩" },
];

/**
 * The avatar at the top right of the desktop bar: my profile spaces, the app
 * theme and logging out. Closes on a click outside, Escape or a new page.
 */
export function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Mon compte"
        className="grid place-items-center rounded-full press ring-offset-2 ring-offset-bg hover:ring-2 hover:ring-primary/50"
      >
        <Avatar name={user?.displayName ?? "?"} size={40} assetId={user?.avatarAssetId} framing={user?.avatarFraming} species={user?.companion} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 flex w-72 flex-col gap-1 rounded-token border border-border bg-surface p-2 shadow-card animate-pop">
          <Link to="/profile" role="menuitem" className="flex items-center gap-3 rounded-token-sm p-2 hover:bg-surface-2">
            <Avatar name={user?.displayName ?? "?"} size={44} assetId={user?.avatarAssetId} framing={user?.avatarFraming} species={user?.companion} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{user?.displayName}</span>
              <span className="block truncate text-xs text-text-muted">Voir mon profil · @{user?.username}</span>
            </span>
          </Link>
          <hr className="my-1 border-border" />
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} role="menuitem" className="flex items-center gap-3 rounded-token-sm px-2 py-2 text-sm font-semibold hover:bg-surface-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2" aria-hidden="true">{l.emoji}</span>
              {l.label}
            </Link>
          ))}
          <hr className="my-1 border-border" />
          <div className="px-2 py-1">
            <p className="mb-1.5 text-xs font-semibold text-text-muted">Thème de l'appli</p>
            <ThemeToggle />
          </div>
          <hr className="my-1 border-border" />
          <button type="button" role="menuitem" onClick={logout} className="flex items-center gap-3 rounded-token-sm px-2 py-2 text-left text-sm font-semibold text-text-muted hover:bg-surface-2 hover:text-danger">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2" aria-hidden="true"><Icon name="logout" size={16} /></span>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
