import type { Widget } from "../profile/types";
import type { LinkedWidget } from "./types";

/**
 * Common widgets that are the very same as one a profile shows in the side
 * menus (typically a copy made by the old "Partager" button). The server
 * sends both kinds in the same shape, so they compare by content.
 */
export function copiesOfLinked(linked: LinkedWidget[]): (w: Widget) => boolean {
  const keys = new Set(linked.map((l) => JSON.stringify(l.widget)));
  return (w) => keys.has(JSON.stringify(w));
}
