import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { Avatar } from "../ui/Avatar";
import { CompanionPicker } from "../ui/CompanionPicker";
import { Icon } from "../ui/Icon";
import { navItems } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Mobile-only slide-in menu (burger). Gives phones access to everything the
 * desktop Sidebar holds but the bottom bar can't: theme switch, companion
 * choice, profile customization and logout. Hidden on lg+ where the Sidebar
 * already covers this.
 */
export function MobileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const items = navItems(user?.id);

  // Close on navigation and on Escape.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-full glass text-text press hover:text-primary lg:hidden"
      >
        <Icon name="menu" size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-up"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col gap-4 border-r border-border bg-surface px-4 py-5 shadow-card animate-fade-up">
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl font-bold text-grad">MemoCat</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-text"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-token border border-border bg-surface-2 p-2">
              <Avatar name={user?.displayName ?? "?"} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.displayName}</p>
                <p className="truncate text-xs text-text-muted">@{user?.username}</p>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    "flex items-center gap-3 rounded-token px-3 py-2.5 font-semibold transition press " +
                    (isActive ? "bg-surface-2 text-text" : "text-text-muted hover:bg-surface-2/60 hover:text-text")
                  }
                >
                  <Icon name={it.icon} size={20} />
                  {it.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-text-muted">Compagnon</p>
                <CompanionPicker compact />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-text-muted">Thème</p>
                <ThemeToggle />
              </div>
              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 rounded-token border border-border bg-surface-2 px-3 py-2.5 font-semibold text-danger press hover:border-danger/50"
              >
                <Icon name="logout" size={18} />
                Se déconnecter
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
