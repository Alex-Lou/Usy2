import { NavLink } from "react-router-dom";
import { openTab } from "../../lib/refresh";
import { useAuth } from "../../features/auth/useAuth";
import { useUnreadMessages } from "../../features/chat/unread";
import { CountBubble } from "../ui/CountBubble";
import { Icon } from "../ui/Icon";
import { navItems } from "./nav";

export function BottomTabBar() {
  const { user } = useAuth();
  const items = navItems(user?.id);
  const unread = useUnreadMessages();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 glass border-t border-border pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {items.map((it) => (
          <NavLink
            onClick={openTab}
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
                    "relative grid h-9 w-9 place-items-center rounded-token-sm transition " +
                    (isActive ? "seg-on" : "")
                  }
                >
                  <Icon name={it.icon} size={21} />
                  {it.to === "/chat" && <CountBubble count={unread} label={`${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`} />}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
