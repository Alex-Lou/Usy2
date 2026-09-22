export type FontKey = "trebuchet" | "georgia" | "courier" | "comic" | "system";
export type LayoutKey = "classic" | "sidebar-left";

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
}

export type Widget =
  | { type: "marquee"; text: string }
  | { type: "quote"; text: string }
  | { type: "mood"; emoji: string; label?: string };

export interface Profile {
  userId: number;
  displayName: string;
  theme: Theme;
  widgets: Widget[];
}
