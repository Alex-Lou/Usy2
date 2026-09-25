import type { Framing } from "../../lib/framing";

export type FontKey =
  | "app" // the app's own font (no override)
  | "trebuchet" | "georgia" | "courier" | "comic" | "system"
  | "nunito" | "quicksand" | "comfortaa" | "baloo" | "fredoka"
  | "dancing" | "pacifico" | "satisfy" | "indie" | "patrick" | "caveat"
  | "uncial" | "medieval" | "cinzel" | "almendra" | "imfell"
  | "playfair" | "lora" | "cormorant" | "garamond";
export type FontScope = "profile" | "app";
export type LayoutKey = "classic" | "sidebar-left";
export type ThemeMode = "app" | "custom";
export type WidgetGap = "s" | "m" | "l";

/** The parts of a profile that have a look of their own ("widgets" = every frame's default). */
export type PartKey = "page" | "header" | "tabs" | "widgets";

/**
 * The look of one part (see backend PartStyleDto). Every field is optional:
 * absent = the part's usual look. Colours are #rrggbb.
 */
export interface PartStyle {
  bg?: string;
  bg2?: string; // with bg: a two-colour gradient
  opacity?: number; // background opacity, 0..100
  text?: string;
  accent?: string;
  border?: "none" | "thin" | "thick";
  borderColor?: string;
  radius?: "square" | "soft" | "round";
  shadow?: "none" | "soft" | "strong";
  glass?: boolean;
  font?: FontKey;
  size?: "s" | "m" | "l" | "xl";
  bold?: boolean;
  align?: "left" | "center" | "right";
  photoAssetId?: number; // page only: a photo behind everything…
  veil?: number; // …under a veil of the background colour, 0..90
}

export interface ThemeColors {
  bg: string;
  surface: string;
  primary: string;
  text: string;
}

export interface Theme {
  colors: ThemeColors;
  font: FontKey;
  layout: LayoutKey;
  mode?: ThemeMode; // "app" (follow app light/dark) by default, or "custom" colors
  headingFont?: FontKey | null; // titles; null = the app's title font
  fontScope?: FontScope | null; // null = saved before fonts had a scope (see fontsApply)
  widgetGap?: WidgetGap | null; // space between the profile's widgets (null = "m")
  parts?: Partial<Record<PartKey, PartStyle>> | null; // each part's look (see partStyle.ts)
}

export type Widget = (
  | { type: "marquee"; text: string }
  | { type: "quote"; text: string }
  | { type: "richtext"; text: string }
  | { type: "mood"; emoji?: string; label?: string } // shows the live mood; fields are legacy
  | { type: "clock"; label?: string }
  | { type: "countdown"; date: string; label?: string }
  | { type: "image"; assetId: number; label?: string }
  | { type: "svg"; variant: string; label?: string }
  | { type: "pins"; label?: string; pins: Pin[] }
) & {
  home?: boolean; // also shown at the top of the home feed
  w?: number; // width on the profile grid, 1..4 cells (default: half, marquee full)
  h?: number; // height, 1..4 rows (default: follows the content)
  style?: PartStyle; // its own look on the profile, over the frames' default
};

/** A pinned web page (quick access): its address and an optional short name. */
export interface Pin {
  url: string;
  label?: string;
}

export type WidgetType = Widget["type"];

export interface Profile {
  userId: number;
  displayName: string;
  avatarAssetId?: number | null;
  companion?: string;
  bio?: string | null;
  theme: Theme;
  widgets: Widget[];
  coverAssetId?: number | null; // photo in the profile banner (else the theme gradient)
  avatarFraming?: Framing | null; // which part of each photo shows (null: centred)
  coverFraming?: Framing | null;
}
