import { NavLink } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { Icon } from "../ui/Icon";
import { navItems } from "./nav";

export function BottomTabBar() {
  const { user } = useAuth();
  const items = navItems(user?.id);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 glass border-t border-border pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            aria-label={it.label}
            title={it.label}
            className={({ isActive }) =>
              "flex flex-1 items-center justify-center py-2 transition press " +
              (isActive ? "text-primary" : "text-text-muted")
            }
          >
            {({ isActive }) => (
              <>
                {/* Icons only: seven labels do not fit a phone's width. */}
                <span
                  className={
                    "grid h-9 w-9 place-items-center rounded-token-sm transition " +
                    (isActive ? "btn-brand" : "")
                  }
                >
                  <Icon name={it.icon} size={21} />
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
