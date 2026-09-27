// The house's drawings, one SVG per catalog id (decor/, extracted as they are
// by scripts/decor-svgs.mjs; credits in decor/CREDITS.md), as URLs.
const files = import.meta.glob("./decor/*.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

const URLS: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.slice("./decor/".length, -".svg".length), url]),
);

/** The drawing of a catalog id (objects, and the motif of some surfaces). */
export const decorUrl = (id: string): string | undefined => URLS[id];
