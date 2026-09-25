import type { CSSProperties } from "react";
import { onColor } from "../../components/layout/SharedLook";
import { fontStack } from "../../lib/fonts";
import type { PartKey, PartStyle, Theme, Widget } from "./types";

export type Parts = Partial<Record<PartKey, PartStyle>>;

export const PART_LABELS: Record<PartKey, string> = {
  page: "Fond de page",
  header: "Présentation",
  widgets: "Tous les cadres",
};

/**
 * Each part's look: the saved one, else a profile saved with the old "custom
 * colours" gets them spread over the parts (its background now fills the page).
 */
export function partsOf(theme: Theme): Parts {
  if (theme.parts) return theme.parts;
  if (theme.mode !== "custom") return {};
  const c = theme.colors;
  return { page: { bg: c.bg, text: c.text, accent: c.primary }, header: { bg: c.surface }, widgets: { bg: c.surface } };
}

/** `over` on top of `base`, field by field (an absent field keeps the base's). */
export function mergeStyle(base: PartStyle | undefined, over: PartStyle | undefined): PartStyle {
  const out: PartStyle = { ...base };
  for (const [k, v] of Object.entries(over ?? {})) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

/** A frame's look: the frames' default, then its own choices. */
export function widgetStyle(parts: Parts, w: Widget): PartStyle {
  return mergeStyle(parts.widgets, w.style);
}

/** Drops unset fields, so an emptied style saves as nothing. */
export function compact(s: PartStyle | undefined): PartStyle | undefined {
  if (!s) return undefined;
  const out = Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== null)) as PartStyle;
  return Object.keys(out).length ? out : undefined;
}

const alpha = (hex: string, pct: number) => (pct >= 100 ? hex : `color-mix(in srgb, ${hex} ${pct}%, transparent)`);

/** The background: a colour or a two-colour gradient, at its opacity. */
export function fillOf(s: PartStyle): string | null {
  if (!s.bg) return null;
  const o = s.opacity ?? 100;
  return s.bg2 ? `linear-gradient(135deg, ${alpha(s.bg, o)}, ${alpha(s.bg2, o)})` : alpha(s.bg, o);
}

const RADII = { square: ["4px", "3px"], soft: ["14px", "10px"], round: ["28px", "18px"] } as const;
const BORDERS = { none: "0px", thin: "1px", thick: "3px" } as const;
const SHADOWS = {
  none: "none",
  soft: "0 10px 26px -14px rgba(0, 0, 0, 0.45)",
  strong: "0 18px 40px -12px rgba(0, 0, 0, 0.7)",
} as const;
const ZOOM = { s: 0.9, m: 1, l: 1.15, xl: 1.3 } as const;

/**
 * Variables inherited by everything inside a part: its text colour (with the
 * muted text and borders derived from it, so they stay readable), its accent,
 * its font and its corners.
 */
export function scopeVars(s: PartStyle): Record<string, string> {
  const v: Record<string, string> = {};
  if (s.text) {
    v["--color-text"] = s.text;
    v["--color-text-muted"] = `color-mix(in srgb, ${s.text} 68%, transparent)`;
    v["--color-border"] = `color-mix(in srgb, ${s.text} 16%, transparent)`;
  }
  if (s.accent) {
    v["--color-primary"] = s.accent;
    v["--color-primary-foreground"] = onColor(s.accent);
    v["--grad"] = `linear-gradient(135deg, ${s.accent} 0%, color-mix(in srgb, ${s.accent} 55%, #22d3ee) 100%)`;
  }
  const font = fontStack(s.font);
  if (font) {
    v["--font-body"] = font;
    v["--font-display"] = font;
    v["--font-script"] = font;
  }
  if (s.radius) [v["--radius"], v["--radius-sm"]] = RADII[s.radius];
  return v;
}

/**
 * Classes and variables that dress a part. They go on a wrapper and paint its
 * direct child (a widget's own box, the presentation card…), see skin.css.
 * `box`: background, border, shadow, frosted glass; `text`: size, weight, alignment.
 */
export function skin(s: PartStyle, what: { box?: boolean; text?: boolean; scope?: boolean } = { box: true, text: true, scope: true }) {
  const cls = ["mc-skin"];
  const style: Record<string, string> = what.scope ? scopeVars(s) : {};
  if (what.box) {
    const fill = fillOf(s);
    if (fill) {
      cls.push("mc-skin--bg");
      style["--skin-bg"] = fill;
    }
    if (s.glass) cls.push("mc-skin--glass");
    if (s.border) {
      cls.push("mc-skin--border");
      style["--skin-bw"] = BORDERS[s.border];
    }
    if (s.borderColor && s.border !== "none") {
      cls.push("mc-skin--bc");
      style["--skin-bc"] = s.borderColor;
    }
    if (s.shadow) {
      cls.push("mc-skin--shadow");
      style["--skin-shadow"] = SHADOWS[s.shadow];
    }
  }
  if (what.text) {
    if (s.size && s.size !== "m") {
      cls.push("mc-skin--zoom");
      style["--skin-zoom"] = String(ZOOM[s.size]);
    }
    if (s.bold) cls.push("mc-skin--bold");
    if (s.align) {
      cls.push("mc-skin--align");
      style["--skin-align"] = s.align;
      style["--skin-flex"] = s.align === "left" ? "flex-start" : s.align === "right" ? "flex-end" : "center";
    }
  }
  return { className: cls.join(" "), style: style as CSSProperties };
}

/** Variables for the whole profile page: the parts inherit them. */
export function pageVars(s: PartStyle): CSSProperties {
  const v = scopeVars({ ...s, radius: undefined });
  if (s.bg) {
    v["--color-bg"] = s.bg;
    v["--color-bg-2"] = `color-mix(in srgb, ${s.bg} 88%, ${s.text ?? "#808080"})`;
  }
  return v as CSSProperties;
}

/** Every font a profile's parts use (to load them). */
export function partFonts(parts: Parts, widgets: Widget[]) {
  return [...Object.values(parts).map((p) => p?.font), ...widgets.map((w) => w.style?.font)];
}

/** Ready-made looks: they fill every part at once (each frame's own look stays). */
export const PRESETS: { id: string; label: string; swatch: string; parts: Parts }[] = [
  {
    id: "night",
    label: "Nuit étoilée",
    swatch: "linear-gradient(135deg, #0f1030, #2a1650)",
    parts: {
      page: { bg: "#0f1030", bg2: "#2a1650", text: "#ecebff", accent: "#ffd45e" },
      header: { bg: "#1b1a45", opacity: 80, glass: true, border: "thin", borderColor: "#ffd45e", radius: "round" },
      widgets: { bg: "#1b1a45", opacity: 75, glass: true, border: "thin", borderColor: "#3a3470", radius: "soft" },
    },
  },
  {
    id: "peach",
    label: "Pêche douce",
    swatch: "linear-gradient(135deg, #ffe8d6, #ffd1dc)",
    parts: {
      page: { bg: "#ffe8d6", bg2: "#ffd1dc", text: "#5a3a3a", accent: "#e0707f" },
      header: { bg: "#fff7f0", radius: "round", shadow: "soft", border: "none", font: "dancing" },
      widgets: { bg: "#fff7f0", radius: "round", shadow: "soft", border: "none" },
    },
  },
  {
    id: "forest",
    label: "Forêt enchantée",
    swatch: "linear-gradient(135deg, #16301f, #2e4a2a)",
    parts: {
      page: { bg: "#16301f", bg2: "#2e4a2a", text: "#e8f3e0", accent: "#9fe0a4" },
      header: { bg: "#1f3b26", opacity: 90, border: "thin", borderColor: "#4f7a4f", font: "almendra" },
      widgets: { bg: "#1f3b26", opacity: 85, border: "thin", borderColor: "#4f7a4f", radius: "soft" },
    },
  },
  {
    id: "paper",
    label: "Papier & encre",
    swatch: "linear-gradient(135deg, #f3ead8, #fffaf1)",
    parts: {
      page: { bg: "#f3ead8", text: "#3c332a", accent: "#b5476b" },
      header: { bg: "#fffaf1", border: "thin", borderColor: "#d9c7a8", radius: "square", shadow: "soft", font: "caveat" },
      widgets: { bg: "#fffaf1", border: "thin", borderColor: "#d9c7a8", radius: "square", shadow: "soft", font: "patrick" },
    },
  },
  {
    id: "neon",
    label: "Néon rétro",
    swatch: "linear-gradient(135deg, #0d0b1a, #ff3d9a)",
    parts: {
      page: { bg: "#0d0b1a", bg2: "#1a0b2e", text: "#f5f3ff", accent: "#22d3ee" },
      header: { bg: "#140f2e", border: "thick", borderColor: "#22d3ee", radius: "square", shadow: "strong", font: "baloo" },
      widgets: { bg: "#140f2e", border: "thick", borderColor: "#ff3d9a", radius: "square", shadow: "strong" },
    },
  },
  {
    id: "ocean",
    label: "Océan calme",
    swatch: "linear-gradient(135deg, #0e3b53, #1b6f8a)",
    parts: {
      page: { bg: "#0e3b53", bg2: "#1b6f8a", text: "#effaff", accent: "#7cc6e8" },
      header: { bg: "#ffffff", opacity: 14, glass: true, radius: "round", border: "thin", borderColor: "#7cc6e8" },
      widgets: { bg: "#ffffff", opacity: 14, glass: true, radius: "round", border: "thin", borderColor: "#2f86a3" },
    },
  },
];
