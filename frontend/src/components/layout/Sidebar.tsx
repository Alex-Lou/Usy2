import { NavLink } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { Avatar } from "../ui/Avatar";

/** Places one click away, below my profile (the main sections are in the top bar). */
const SHORTCUTS: { to: string; label: string; emoji: string }[] = [
  { to: "/profile/nous", label: "Notre profil", emoji: "💑" },
  { to: "/carnet", label: "Notre carnet", emoji: "📓" },
  { to: "/jeux/nous", label: "Nous deux", emoji: "💞" },
  { to: "/jeux/chat", label: "La maison de Moka", emoji: "🐱" },
  { to: "/jeux/quiz", label: "Quiz", emoji: "🧠" },
  { to: "/jeux/direct", label: "En direct", emoji: "⚡" },
  { to: "/jeux/bataille", label: "Bataille navale", emoji: "🚢" },
];

const row = ({ isActive }: { isActive: boolean }) =>
  "flex items-center gap-3 rounded-token px-2.5 py-2 text-sm font-semibold transition press "
  + (isActive ? "bg-surface-2 text-text shadow-glow" : "text-text-muted hover:bg-surface-2/60 hover:text-text");

/**
 * 🖥️ The desktop left rail (lg and up), below the top bar: my profile, then
 * our shortcuts.
 */
export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="fixed bottom-0 left-0 top-desk-bar z-30 hidden w-shell flex-col gap-1 overflow-y-auto overflow-x-hidden border-r border-border glass px-3 py-4 lg:flex">
      <NavLink to={user ? `/profile/${user.id}` : "/profile"} className={row}>
        <Avatar name={user?.displayName ?? "?"} size={36} assetId={user?.avatarAssetId} framing={user?.avatarFraming} species={user?.companion} />
        <span className="min-w-0 truncate">{user?.displayName}</span>
      </NavLink>

      <p className="mt-4 px-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Raccourcis</p>
      <nav className="flex flex-col gap-0.5" aria-label="Raccourcis">
        {SHORTCUTS.map((s) => (
          <NavLink key={s.to} to={s.to} className={row}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-token-sm bg-bg-2/60 text-lg" aria-hidden="true">{s.emoji}</span>
            <span className="truncate">{s.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
