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
  | { type: "mood"; emoji: string; label?: string }
  | { type: "clock"; label?: string }
  | { type: "countdown"; date: string; label?: string }
  | { type: "image"; assetId: number; label?: string }
  | { type: "svg"; variant: string; label?: string };

export type WidgetType = Widget["type"];

export interface Profile {
  userId: number;
  displayName: string;
  theme: Theme;
  widgets: Widget[];
}
