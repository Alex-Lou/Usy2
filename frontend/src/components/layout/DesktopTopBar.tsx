import { NavLink } from "react-router-dom";
import { openTab } from "../../lib/refresh";
import { useAuth } from "../../features/auth/useAuth";
import { Icon } from "../ui/Icon";
import { AccountMenu } from "./AccountMenu";
import { useUnreadMessages } from "../../features/chat/unread";
import { CountBubble } from "../ui/CountBubble";
import { navItems } from "./nav";
import { NotificationBell } from "./NotificationBell";
import { SearchButton } from "./SearchButton";

/**
 * 🖥️ The desktop top bar (lg and up), Facebook-like: the logo over the left
 * rail, the main sections as tabs in the middle, then the notifications and
 * my account. Between lg and xl the right rail is a drawer, opened from here.
 */
export function DesktopTopBar({ railOpen, onRail }: { railOpen: boolean; onRail: () => void }) {
  const { user } = useAuth();
  // The profile lives in the account menu, on the right.
  const tabs = navItems(user?.id).filter((it) => it.to !== "/profile");
  const unread = useUnreadMessages();

  return (
    <header className="fixed inset-x-0 top-0 z-40 hidden h-desk-bar items-center border-b border-border glass lg:flex">
      <div className="flex w-shell shrink-0 items-center gap-2 px-6">
        <span className="grid h-9 w-9 place-items-center rounded-token-sm btn-brand" aria-hidden="true">
          <Icon name="heart" size={18} />
        </span>
        <span className="font-display text-xl font-bold text-grad">MemoCat</span>
      </div>

      <nav className="flex h-full flex-1 items-stretch justify-center gap-1" aria-label="Sections">
        {tabs.map((it) => (
          <NavLink
            onClick={openTab}
            key={it.to}
            to={it.to}
            end={it.end}
            title={it.label}
            aria-label={it.label}
            className={({ isActive }) =>
              "group relative flex w-24 items-center justify-center transition " + (isActive ? "text-primary" : "text-text-muted hover:text-text")
            }
          >
            {({ isActive }) => (
              <>
                <span className={"grid h-11 w-full place-items-center rounded-token-sm " + (isActive ? "" : "group-hover:bg-surface-2/70")}>
                  <span className="relative">
                    <Icon name={it.icon} size={22} />
                    {it.to === "/chat" && <CountBubble count={unread} label={`${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`} />}
                  </span>
                </span>
                <span className={"absolute inset-x-2 bottom-0 h-[3px] rounded-t-full " + (isActive ? "bg-primary" : "bg-transparent")} aria-hidden="true" />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex shrink-0 items-center justify-end gap-2 px-4 xl:w-shell-right">
        <button
          type="button"
          onClick={onRail}
          aria-pressed={railOpen}
          aria-label={railOpen ? "Fermer le panneau" : "Nos widgets et le compagnon"}
          title="Nos widgets et le compagnon"
          className={"grid h-11 w-11 place-items-center rounded-full glass press xl:hidden " + (railOpen ? "text-primary" : "text-text hover:text-primary")}
        >
          <Icon name="sparkles" size={20} />
        </button>
        <SearchButton inline />
        <NotificationBell inline />
        <AccountMenu />
      </div>
    </header>
  );
}
