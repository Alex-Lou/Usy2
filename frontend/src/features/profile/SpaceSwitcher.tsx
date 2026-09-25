import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

/**
 * My four spaces, always at the same place: see my profile, edit it, our
 * shared space, my side menu. Each has its own page, look and options.
 */
export function SpaceSwitcher() {
  const { user } = useAuth();
  const spaces = [
    { to: user ? `/profile/${user.id}` : "/profile", icon: "👁", label: "Profil", short: "Voir" },
    { to: "/profile/moi", icon: "✏️", label: "Mon profil", short: "Moi" },
    { to: "/profile/nous", icon: "💞", label: "Notre profil", short: "Nous" },
    { to: "/profile/barre", icon: "🧩", label: "Barre latérale", short: "Barre" },
  ];
  return (
    <nav aria-label="Mes espaces" className="relative z-10 -mx-1 overflow-x-auto px-1 no-scrollbar">
      <div className="flex min-w-max gap-1 rounded-full border border-border bg-surface/90 p-1 shadow-card backdrop-blur sm:min-w-0">
        {spaces.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end
            className={({ isActive }) =>
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition press " +
              (isActive ? "btn-brand" : "text-text-muted hover:text-text")
            }
          >
            <span className="mc-emoji" aria-hidden="true">{s.icon}</span>
            <span className="sm:hidden">{s.short}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
