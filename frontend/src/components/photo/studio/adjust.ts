/**
 * Colour adjustments for the photo studio. The preview uses the CSS filter
 * string (instant, GPU); the export applies the very same maths pixel by pixel
 * (CSS Filter Effects spec matrices), so the saved photo matches the preview —
 * even where canvas `filter` is unsupported (older iPhones).
 */
export interface Adjust {
  brightness: number; // 1 = unchanged
  contrast: number;
  saturate: number;
  sepia: number; // 0..1
  grayscale: number; // 0..1
  hue: number; // degrees
}

export const NEUTRAL: Adjust = { brightness: 1, contrast: 1, saturate: 1, sepia: 0, grayscale: 0, hue: 0 };

export const PRESETS: { id: string; label: string; adjust: Adjust }[] = [
  { id: "none", label: "Original", adjust: NEUTRAL },
  { id: "soft", label: "Doux", adjust: { ...NEUTRAL, brightness: 1.06, contrast: 0.9, saturate: 0.9 } },
  { id: "vivid", label: "Vif", adjust: { ...NEUTRAL, contrast: 1.1, saturate: 1.45 } },
  { id: "warm", label: "Chaud", adjust: { ...NEUTRAL, sepia: 0.2, saturate: 1.15, hue: -8 } },
  { id: "cool", label: "Froid", adjust: { ...NEUTRAL, brightness: 1.02, saturate: 0.95, hue: 14 } },
  { id: "vintage", label: "Vintage", adjust: { ...NEUTRAL, brightness: 1.05, contrast: 0.95, saturate: 0.85, sepia: 0.35 } },
  { id: "bw", label: "N&B", adjust: { ...NEUTRAL, contrast: 1.1, grayscale: 1 } },
];

/** Preset combined with the user's sliders (multiplied). */
export function combine(preset: Adjust, sliders: { brightness: number; contrast: number; saturate: number }): Adjust {
  return {
    ...preset,
    brightness: preset.brightness * sliders.brightness,
    contrast: preset.contrast * sliders.contrast,
    saturate: preset.saturate * sliders.saturate,
  };
}

export function cssFilter(a: Adjust): string {
  return `brightness(${a.brightness}) contrast(${a.contrast}) saturate(${a.saturate}) sepia(${a.sepia}) grayscale(${a.grayscale}) hue-rotate(${a.hue}deg)`;
}

type M = number[]; // 3x3 row-major

function saturateM(s: number): M {
  return [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
}

function sepiaM(a: number): M {
  const k = 1 - a;
  return [0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k,
    0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k,
    0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k];
}

function grayscaleM(a: number): M {
  const k = 1 - a;
  return [0.2126 + 0.7874 * k, 0.7152 - 0.7152 * k, 0.0722 - 0.0722 * k,
    0.2126 - 0.2126 * k, 0.7152 + 0.2848 * k, 0.0722 - 0.0722 * k,
    0.2126 - 0.2126 * k, 0.7152 - 0.7152 * k, 0.0722 + 0.9278 * k];
}

function hueM(deg: number): M {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072];
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Applies the adjustments in place, in CSS order (clamping between steps). */
export function applyAdjust(data: ImageData, a: Adjust): void {
  const steps: ((rgb: number[]) => void)[] = [];
  const matrix = (m: M) => (p: number[]) => {
    const [r, g, b] = p;
    p[0] = clamp(m[0] * r + m[1] * g + m[2] * b);
    p[1] = clamp(m[3] * r + m[4] * g + m[5] * b);
    p[2] = clamp(m[6] * r + m[7] * g + m[8] * b);
  };
  if (a.brightness !== 1) steps.push((p) => { for (let i = 0; i < 3; i++) p[i] = clamp(p[i] * a.brightness); });
  if (a.contrast !== 1) steps.push((p) => { for (let i = 0; i < 3; i++) p[i] = clamp((p[i] - 127.5) * a.contrast + 127.5); });
  if (a.saturate !== 1) steps.push(matrix(saturateM(a.saturate)));
  if (a.sepia > 0) steps.push(matrix(sepiaM(a.sepia)));
  if (a.grayscale > 0) steps.push(matrix(grayscaleM(a.grayscale)));
  if (a.hue !== 0) steps.push(matrix(hueM(a.hue)));
  if (steps.length === 0) return;

  const d = data.data;
  const px = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) {
    px[0] = d[i];
    px[1] = d[i + 1];
    px[2] = d[i + 2];
    for (const step of steps) step(px);
    d[i] = px[0];
    d[i + 1] = px[1];
    d[i + 2] = px[2];
  }
}
