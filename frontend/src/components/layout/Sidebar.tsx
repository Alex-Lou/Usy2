import { NavLink } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { Avatar } from "../ui/Avatar";
import { CompanionPicker } from "../ui/CompanionPicker";
import { Icon } from "../ui/Icon";
import { HomeWidgets } from "../../features/feed/HomeWidgets";
import { navItems } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
  const { user, logout } = useAuth();
  const items = navItems(user?.id);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-2 overflow-y-auto border-r border-border glass px-4 py-6 lg:flex">
      <div className="mb-4 flex items-center gap-2 px-2">
        <span className="grid h-10 w-10 place-items-center rounded-token btn-brand">
          <Icon name="heart" size={20} />
        </span>
        <span className="font-display text-2xl font-bold text-grad">MemoCat</span>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              "group flex items-center gap-3 rounded-token px-3 py-2.5 font-semibold transition press " +
              (isActive
                ? "bg-surface-2 text-text shadow-glow"
                : "text-text-muted hover:bg-surface-2/60 hover:text-text")
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={
                    "grid h-9 w-9 place-items-center rounded-token-sm " +
                    (isActive ? "btn-brand" : "bg-bg-2/60 text-text-muted group-hover:text-text")
                  }
                >
                  <Icon name={it.icon} size={20} />
                </span>
                {it.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4">
        <HomeWidgets />
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <CompanionPicker compact />
        <ThemeToggle />
        <div className="flex items-center gap-3 rounded-token border border-border bg-bg-2/50 p-2">
          <Avatar name={user?.displayName ?? "?"} size={38} assetId={user?.avatarAssetId} species={user?.companion} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.displayName}</p>
            <p className="truncate text-xs text-text-muted">@{user?.username}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Se déconnecter"
            className="grid h-9 w-9 place-items-center rounded-token-sm text-text-muted transition hover:text-danger press"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
