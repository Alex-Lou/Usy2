import { useEffect, useState } from "react";
import { emitMyThemeSaved, onMyThemeSaved } from "../profile/AppFonts";
import { getMyProfile, updateSidebar } from "../profile/api";
import type { SidebarPrefs, Widget } from "../profile/types";
import { copiesOfLinked } from "./linked";
import type { SharedWidgets } from "./types";

/** One widget in the side menu, where it comes from, and its key in my choices. */
export interface SidebarItem {
  key: string;
  widget: Widget;
  source: "common" | "mine" | "partner";
  ownerName?: string;
  /** Its place in the common list (common widgets only). */
  index?: number;
}

// The profile-only fields never reach the menu: a widget is known by its content.
const PROFILE_ONLY = new Set(["home", "w", "h", "style", "sidebar"]);

/** The same text for the same content, whatever the order of its fields. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => v !== undefined && v !== null && !PROFILE_ONLY.has(k))
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** A short, stable fingerprint (djb2), in [0-9a-z]. */
function fingerprint(w: Widget): string {
  let h = 5381;
  const text = canonical(w);
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export const commonKey = (w: Widget) => `c:${fingerprint(w)}`;
export const linkedKey = (ownerId: number, w: Widget) => `l:${ownerId}:${fingerprint(w)}`;

/** Everything the side menu can show: the common widgets (their copies of a linked one aside), then the profiles'. */
export function sidebarItems(shared: SharedWidgets, myId: number | undefined): SidebarItem[] {
  const linked = shared.linked ?? [];
  const isCopy = copiesOfLinked(linked);
  return [
    ...shared.widgets.flatMap((widget, index): SidebarItem[] => (isCopy(widget) ? [] : [{ key: commonKey(widget), widget, source: "common", index }])),
    ...linked.map((l): SidebarItem => ({
      key: linkedKey(l.ownerId, l.widget),
      widget: l.widget,
      source: l.ownerId === myId ? "mine" : "partner",
      ownerName: l.ownerName,
    })),
  ];
}

/** My menu: the items I did not hide, in my order (new ones at the end); and the hidden ones. */
export function arrange(items: SidebarItem[], prefs: SidebarPrefs) {
  const hidden = new Set(prefs.hidden ?? []);
  const rank = new Map((prefs.order ?? []).map((k, i) => [k, i]));
  const place = (it: SidebarItem, i: number) => rank.get(it.key) ?? 1000 + i;
  const ordered = items.map((it, i) => ({ it, at: place(it, i) })).sort((a, b) => a.at - b.at).map((x) => x.it);
  return { shown: ordered.filter((it) => !hidden.has(it.key)), hidden: ordered.filter((it) => hidden.has(it.key)) };
}

/** My side menu choices (stored with my profile, on every device), kept up to date. */
export function useMySidebarPrefs(): SidebarPrefs | null {
  const [prefs, setPrefs] = useState<SidebarPrefs | null>(null);
  useEffect(() => {
    getMyProfile()
      .then((p) => setPrefs(p.theme.sidebar ?? {}))
      .catch(() => setPrefs({}));
    return onMyThemeSaved((theme) => setPrefs(theme.sidebar ?? {}));
  }, []);
  return prefs;
}

/** Saves my choices, keeping only keys of items that still exist; every menu follows at once. */
export async function saveSidebarPrefs(prefs: SidebarPrefs, items: SidebarItem[]): Promise<void> {
  const known = new Set(items.map((it) => it.key));
  const saved = await updateSidebar({
    hidden: (prefs.hidden ?? []).filter((k) => known.has(k)),
    order: (prefs.order ?? []).filter((k) => known.has(k)),
    off: prefs.off || undefined,
  });
  emitMyThemeSaved(saved.theme);
}
