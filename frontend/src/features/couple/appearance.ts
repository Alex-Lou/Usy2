import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api/client";
import type { FontKey } from "../profile/types";
import { onCoupleActivity } from "./activity";

/**
 * The shared look of the app, for both (see SharedAppearanceService.java):
 * general fonts, accent colour, background, default font/size of the
 * messages. Null = the app's default. Each person's own choices still win.
 */
export interface Appearance {
  font: FontKey | null;
  headingFont: FontKey | null;
  accent: string | null; // #rrggbb
  background: BackgroundId | null;
  backgroundAssetId: number | null;
  chatFont: FontKey | null;
  chatSize: "s" | "m" | "l" | "xl" | null;
}

export type BackgroundId = "sunset" | "ocean" | "forest" | "night" | "rose" | "photo";

export const NO_APPEARANCE: Appearance = {
  font: null,
  headingFont: null,
  accent: null,
  background: null,
  backgroundAssetId: null,
  chatFont: null,
  chatSize: null,
};

/** Background presets (full-screen gradients behind the app). */
export const BACKGROUNDS: { id: Exclude<BackgroundId, "photo">; label: string; css: string }[] = [
  { id: "sunset", label: "Coucher de soleil", css: "linear-gradient(160deg, #ff9a8b 0%, #ff6a88 45%, #ff99ac 100%)" },
  { id: "ocean", label: "Océan", css: "linear-gradient(160deg, #2e3192 0%, #1bb5d8 100%)" },
  { id: "forest", label: "Forêt", css: "linear-gradient(160deg, #134e5e 0%, #71b280 100%)" },
  { id: "night", label: "Nuit", css: "linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)" },
  { id: "rose", label: "Rose", css: "linear-gradient(160deg, #f8cdda 0%, #6d5a9c 100%)" },
];

export const ACCENTS = ["#ff3d9a", "#c65b7c", "#a855f7", "#3b82f6", "#14b8a6", "#22c55e", "#f59e0b", "#ef4444"];

export function saveAppearance(a: Appearance): Promise<Appearance> {
  return apiRequest<Appearance>("/api/couple/appearance", { method: "PUT", body: a });
}

// One shared copy for every component, refreshed when either person changes it.
let current: Appearance | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<(a: Appearance) => void>();

function publish(a: Appearance): void {
  current = a;
  listeners.forEach((l) => l(a));
}

function load(): Promise<void> {
  loading ??= apiRequest<Appearance>("/api/couple/appearance")
    .then(publish)
    .catch(() => {})
    .finally(() => (loading = null));
  return loading;
}

/** Replaces the shared copy at once (e.g. right after saving). */
export function setAppearance(a: Appearance): void {
  publish(a);
}

export function useSharedAppearance(): Appearance {
  const [value, setValue] = useState<Appearance>(current ?? NO_APPEARANCE);
  useEffect(() => {
    listeners.add(setValue);
    if (current) setValue(current);
    else void load();
    const off = onCoupleActivity((a) => a.kind === "appearance" && void load());
    return () => {
      listeners.delete(setValue);
      off();
    };
  }, []);
  return value;
}
