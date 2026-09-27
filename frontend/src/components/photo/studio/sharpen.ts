/**
 * Sharpening for blurry photos ("unsharp mask"): out = in + amount × (in − blur).
 * The blur radius is a fraction of the frame width, so the on-screen preview
 * (an SVG filter, see SharpenFilter) and the full-size export look the same.
 */
export const SIGMA_OF_WIDTH = 0.005; // blur radius as a fraction of the frame width (8 px on a 1600 px export, about the size of a typical blur)
export const MAX_AMOUNT = 2;
export const ENHANCE_AMOUNT = 1.5; // what the one-tap "Améliorer" button sets

/** Box sizes whose 3 successive passes approximate a gaussian of this sigma. */
function boxRadii(sigma: number): number[] {
  const n = 3;
  const ideal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(ideal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  return Array.from({ length: n }, (_, i) => ((i < m ? wl : wu) - 1) / 2);
}

/** One box-blur pass along a direction, edges repeated (like the preview's edgeMode="duplicate"). */
function boxPass(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number, horizontal: boolean): void {
  const lines = horizontal ? h : w;
  const len = horizontal ? w : h;
  const step = horizontal ? 4 : w * 4;
  const size = 2 * r + 1;
  for (let line = 0; line < lines; line++) {
    const base = horizontal ? line * w * 4 : line * 4;
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[base + Math.min(len - 1, Math.max(0, k)) * step + c];
      for (let i = 0; i < len; i++) {
        dst[base + i * step + c] = sum / size;
        const out = Math.max(0, i - r);
        const inn = Math.min(len - 1, i + r + 1);
        sum += src[base + inn * step + c] - src[base + out * step + c];
      }
    }
  }
}

/** Sharpens in place. `sigma` in pixels of this image. */
export function sharpen(data: ImageData, amount: number, sigma: number): void {
  if (amount <= 0 || sigma <= 0) return;
  const { width: w, height: h, data: d } = data;
  const blur = new Uint8ClampedArray(d);
  const tmp = new Uint8ClampedArray(d.length);
  for (const r of boxRadii(sigma)) {
    if (r < 1) continue;
    boxPass(blur, tmp, w, h, r, true);
    boxPass(tmp, blur, w, h, r, false);
  }
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) d[i + c] = d[i + c] + amount * (d[i + c] - blur[i + c]); // clamped by the array
  }
}
