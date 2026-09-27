import type { IconName } from "../ui/Icon";

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

export function navItems(_myUserId?: number): NavItem[] {
  return [
    { to: "/", label: "Accueil", icon: "home", end: true },
    { to: "/albums", label: "Albums", icon: "images" },
    { to: "/jeux", label: "Jeux", icon: "gamepad" },
    { to: "/chat", label: "Messages", icon: "chat" },
    { to: "/dates", label: "Calendrier", icon: "calendar" },
    // "/profile" (my own view) stays lit in my four spaces: /profile/moi, /nous, /barre.
    { to: "/profile", label: "Profil", icon: "user" },
  ];
}

