/**
 * Frames painted around the photo (inside its edges). The preview draws them
 * on a canvas over the photo with this very function, so what is saved looks
 * like what was shown. Sizes are fractions of the photo's shorter side.
 */
export type BorderId = "none" | "white" | "polaroid" | "film" | "neon";

export const BORDERS: { id: BorderId; label: string }[] = [
  { id: "none", label: "Aucun" },
  { id: "white", label: "Bordure" },
  { id: "polaroid", label: "Polaroïd" },
  { id: "film", label: "Pellicule" },
  { id: "neon", label: "Néon" },
];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

export function drawBorder(ctx: CanvasRenderingContext2D, id: BorderId, W: number, H: number): void {
  if (id === "none") return;
  const m = Math.min(W, H);
  ctx.save();
  if (id === "white" || id === "polaroid") {
    const side = (id === "white" ? 0.035 : 0.045) * m;
    const bottom = id === "white" ? side : 0.16 * m;
    ctx.fillStyle = id === "white" ? "#ffffff" : "#fbf8f2";
    ctx.fillRect(0, 0, W, side);
    ctx.fillRect(0, H - bottom, W, bottom);
    ctx.fillRect(0, 0, side, H);
    ctx.fillRect(W - side, 0, side, H);
    if (id === "polaroid") {
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = Math.max(1, 0.003 * m);
      ctx.strokeRect(side, side, W - 2 * side, H - side - bottom);
    }
  } else if (id === "film") {
    const bar = 0.09 * m;
    const edge = 0.015 * m;
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar, W, bar);
    ctx.fillRect(0, 0, edge, H);
    ctx.fillRect(W - edge, 0, edge, H);
    const holeW = 0.035 * m;
    const holeH = 0.045 * m;
    const step = 0.075 * m;
    const count = Math.max(1, Math.floor(W / step));
    const offset = (W - count * step) / 2 + (step - holeW) / 2;
    ctx.fillStyle = "rgba(242,239,232,0.9)";
    for (let i = 0; i < count; i++) {
      const x = offset + i * step;
      for (const y of [(bar - holeH) / 2, H - bar + (bar - holeH) / 2]) {
        roundRect(ctx, x, y, holeW, holeH, holeW * 0.25);
        ctx.fill();
      }
    }
  } else if (id === "neon") {
    const inset = 0.04 * m;
    const radius = 0.05 * m;
    ctx.strokeStyle = "#ff4fa3";
    ctx.shadowColor = "#ff4fa3";
    ctx.lineWidth = 0.012 * m;
    for (const blur of [0.02 * m, 0.045 * m]) {
      ctx.shadowBlur = blur;
      roundRect(ctx, inset, inset, W - 2 * inset, H - 2 * inset, radius);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffe6f2";
    ctx.lineWidth = 0.004 * m;
    roundRect(ctx, inset, inset, W - 2 * inset, H - 2 * inset, radius);
    ctx.stroke();
  }
  ctx.restore();
}
