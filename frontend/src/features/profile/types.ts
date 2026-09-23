export type FontKey = "trebuchet" | "georgia" | "courier" | "comic" | "system";
export type LayoutKey = "classic" | "sidebar-left";
export type ThemeMode = "app" | "custom";

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
}

export type Widget =
  | { type: "marquee"; text: string }
  | { type: "quote"; text: string }
  | { type: "richtext"; text: string }
  | { type: "mood"; emoji?: string; label?: string } // shows the live mood; fields are legacy
  | { type: "clock"; label?: string }
  | { type: "countdown"; date: string; label?: string }
  | { type: "image"; assetId: number; label?: string }
  | { type: "svg"; variant: string; label?: string }
  | { type: "pins"; label?: string; pins: Pin[] };

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
}
