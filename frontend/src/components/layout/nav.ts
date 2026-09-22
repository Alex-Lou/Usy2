import type { IconName } from "../ui/Icon";

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

// Profil resolves to the current user's id at render time.
export function navItems(myUserId?: number): NavItem[] {
  return [
    { to: "/", label: "Accueil", icon: "home", end: true },
    { to: "/albums", label: "Albums", icon: "images" },
    { to: "/jeux", label: "Jeux", icon: "gamepad" },
    { to: "/chat", label: "Messages", icon: "chat" },
    { to: myUserId ? `/profile/${myUserId}` : "/profile/edit", label: "Profil", icon: "user" },
  ];
}
