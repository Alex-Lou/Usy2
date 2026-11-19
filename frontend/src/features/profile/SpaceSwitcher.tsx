import { NavLink } from "react-router-dom";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useAuth } from "../auth/useAuth";

/**
 * My two spaces: my profile (« Modifier » on it opens the editor) and ours.
 * My settings and my side menu live in the editor, under « Moi ».
 */
export function SpaceSwitcher() {
  const { user } = useAuth();
  const spaces: { to: string; icon: IconName; label: string }[] = [
    { to: user ? `/profile/${user.id}` : "/profile", icon: "user", label: "Mon profil" },
    { to: "/profile/nous", icon: "heart", label: "Notre profil" },
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
              (isActive ? "seg-on" : "text-text-muted hover:text-text")
            }
          >
            <Icon name={s.icon} size={16} />
            {s.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
