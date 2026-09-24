import { NEUTRAL, type Adjust } from "./adjust";

/**
 * "Looks" for the photo studio: a colour adjustment (see adjust.ts) plus
 * colour layers blended on top, and the finishing sliders (warmth, fade,
 * vignette, grain). The preview stacks the same layers as CSS blend modes
 * over the photo; the export paints them with the same canvas composite
 * operations (both follow the W3C compositing spec), so what is saved looks
 * like what was shown.
 */
export type Blend = "soft-light" | "multiply" | "screen" | "lighten" | "overlay";

export interface Tint {
  color: string;
  blend: Blend;
  opacity: number; // 0..1
}

export interface Finish {
  warmth: number; // -1 (cool) .. 1 (warm)
  fade: number; // 0..1, lifts the blacks
  vignette: number; // 0..1, darker corners
  grain: number; // 0..1, film grain
}

export const NO_FINISH: Finish = { warmth: 0, fade: 0, vignette: 0, grain: 0 };

export interface Look {
  id: string;
  label: string;
  adjust: Adjust;
  tints?: Tint[];
  finish?: Partial<Finish>;
}

/** Duotone: shadows towards `dark`, highlights towards `light` (on a grey photo). */
function duotone(dark: string, light: string): Tint[] {
  return [
    { color: dark, blend: "screen", opacity: 1 },
    { color: light, blend: "multiply", opacity: 1 },
  ];
}

export const LOOKS: Look[] = [
  { id: "none", label: "Original", adjust: NEUTRAL },
  { id: "soft", label: "Doux", adjust: { ...NEUTRAL, brightness: 1.06, contrast: 0.9, saturate: 0.9 } },
  { id: "vivid", label: "Vif", adjust: { ...NEUTRAL, contrast: 1.1, saturate: 1.45 } },
  { id: "warm", label: "Chaud", adjust: { ...NEUTRAL, sepia: 0.2, saturate: 1.15, hue: -8 } },
  { id: "cool", label: "Froid", adjust: { ...NEUTRAL, brightness: 1.02, saturate: 0.95, hue: 14 } },
  { id: "vintage", label: "Vintage", adjust: { ...NEUTRAL, brightness: 1.05, contrast: 0.95, saturate: 0.85, sepia: 0.35 } },
  { id: "bw", label: "N&B", adjust: { ...NEUTRAL, contrast: 1.1, grayscale: 1 } },
  { id: "film", label: "Film", adjust: { ...NEUTRAL, contrast: 1.05, saturate: 0.9, sepia: 0.1 }, finish: { warmth: 0.15, fade: 0.35, grain: 0.35 } },
  { id: "faded", label: "Estompé", adjust: { ...NEUTRAL, brightness: 1.04, contrast: 0.9, saturate: 0.8 }, finish: { fade: 0.6 } },
  {
    id: "cinema",
    label: "Cinéma",
    adjust: { ...NEUTRAL, contrast: 1.15, saturate: 1.1 },
    tints: [
      { color: "#1f4f5a", blend: "multiply", opacity: 0.25 },
      { color: "#ff9a4d", blend: "screen", opacity: 0.16 },
    ],
    finish: { vignette: 0.35 },
  },
  {
    id: "pastel",
    label: "Pastel",
    adjust: { ...NEUTRAL, brightness: 1.08, contrast: 0.85, saturate: 0.75 },
    tints: [{ color: "#ffd6e8", blend: "screen", opacity: 0.22 }],
    finish: { fade: 0.3 },
  },
  {
    id: "night",
    label: "Nuit",
    adjust: { ...NEUTRAL, brightness: 0.92, contrast: 1.1, saturate: 0.9, hue: 10 },
    tints: [{ color: "#3a4a9a", blend: "multiply", opacity: 0.35 }],
    finish: { vignette: 0.4 },
  },
  {
    id: "retro",
    label: "Rétro 70s",
    adjust: { ...NEUTRAL, contrast: 0.95, saturate: 1.2, sepia: 0.25 },
    tints: [{ color: "#ff8a00", blend: "soft-light", opacity: 0.35 }],
    finish: { fade: 0.3, grain: 0.25 },
  },
  { id: "duo-pink", label: "Duo rose", adjust: { ...NEUTRAL, contrast: 1.1, grayscale: 1 }, tints: duotone("#2b0f4a", "#ffb3d9") },
  { id: "duo-blue", label: "Duo bleu", adjust: { ...NEUTRAL, contrast: 1.1, grayscale: 1 }, tints: duotone("#0b1f4d", "#8fe3ff") },
  { id: "noir", label: "Noir", adjust: { ...NEUTRAL, brightness: 0.95, contrast: 1.35, grayscale: 1 }, finish: { vignette: 0.5, grain: 0.2 } },
];

export function findLook(id: string): Look {
  return LOOKS.find((l) => l.id === id) ?? LOOKS[0];
}

/** The look's own layers, then the warmth and fade sliders, in painting order. */
export function tintsOf(look: Look, finish: Finish): Tint[] {
  const out = [...(look.tints ?? [])];
  if (finish.warmth !== 0) {
    out.push({ color: finish.warmth > 0 ? "#ff9a3c" : "#3d8bff", blend: "soft-light", opacity: Math.min(1, Math.abs(finish.warmth) * 0.6) });
  }
  if (finish.fade > 0) {
    const v = Math.round(finish.fade * 90);
    out.push({ color: `rgb(${v},${v},${v})`, blend: "lighten", opacity: 1 });
  }
  return out;
}

/** Darkest corner alpha for the vignette slider. */
export function vignetteAlpha(finish: Finish): number {
  return finish.vignette * 0.75;
}

/** Where the vignette starts darkening (fraction of the way to the corner). */
export const VIGNETTE_START = 0.55;

/** CSS for the vignette: an ellipse reaching the corners (same geometry as paintVignette). */
export function vignetteCss(finish: Finish): string {
  return `radial-gradient(ellipse farthest-corner at center, rgba(0,0,0,0) ${VIGNETTE_START * 100}%, rgba(0,0,0,${vignetteAlpha(finish)}) 100%)`;
}

export const GRAIN_TILE = 96;
/** Grain tiles per frame width (preview and export alike). */
export const GRAIN_PER_WIDTH = 5;

let grainTile: HTMLCanvasElement | null = null;

/** A fixed grey noise tile (seeded, so the grain never changes between preview and export). */
export function grainCanvas(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const c = document.createElement("canvas");
  c.width = GRAIN_TILE;
  c.height = GRAIN_TILE;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(GRAIN_TILE, GRAIN_TILE);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = 128 + ((seed >> 8) % 96) - 48;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

let grainUrl: string | null = null;

export function grainDataUrl(): string {
  grainUrl ??= grainCanvas().toDataURL("image/png");
  return grainUrl;
}

export function grainOpacity(finish: Finish): number {
  return finish.grain * 0.55;
}

/** Paints the tints, vignette and grain over the (already adjusted) photo. */
export function paintFinish(ctx: CanvasRenderingContext2D, tints: Tint[], finish: Finish, W: number, H: number): void {
  ctx.save();
  for (const t of tints) {
    ctx.globalCompositeOperation = t.blend;
    ctx.globalAlpha = t.opacity;
    ctx.fillStyle = t.color;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  if (finish.vignette > 0) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale((W / 2) * Math.SQRT2, (H / 2) * Math.SQRT2); // CSS "farthest-corner" ellipse
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(VIGNETTE_START, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${vignetteAlpha(finish)})`);
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  if (finish.grain > 0) {
    const pattern = ctx.createPattern(grainCanvas(), "repeat");
    if (pattern) {
      const k = W / GRAIN_PER_WIDTH / GRAIN_TILE;
      pattern.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = grainOpacity(finish);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H);
    }
  }
  ctx.restore();
}
