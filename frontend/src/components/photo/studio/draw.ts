/**
 * Finger drawing on the photo: strokes kept as points (0..1 of the frame) so
 * the preview (SVG) and the export (canvas) draw the same lines at any size.
 * A stroke's width is a fraction of the frame width.
 */
export interface Stroke {
  id: number;
  color: string;
  width: number;
  points: [number, number][];
}

export const BRUSHES: { id: string; label: string; width: number }[] = [
  { id: "fine", label: "Fin", width: 0.008 },
  { id: "medium", label: "Moyen", width: 0.018 },
  { id: "thick", label: "Épais", width: 0.035 },
];

export const DRAW_COLORS = ["#ffffff", "#1a1530", "#ff4f7b", "#ffd45e", "#7cc6e8", "#9fe0a4", "#b18cff"];

/** SVG path of a stroke in a viewBox of `aspect` × 1. */
export function strokePath(s: Stroke, aspect: number): string {
  return s.points.map(([x, y], i) => `${i ? "L" : "M"}${(x * aspect).toFixed(4)} ${y.toFixed(4)}`).join(" ");
}

export function paintStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], W: number, H: number): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    if (s.points.length === 0) continue;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.width * W;
    if (s.points.length === 1) {
      const [x, y] = s.points[0];
      ctx.beginPath();
      ctx.arc(x * W, y * H, (s.width * W) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
    ctx.stroke();
  }
  ctx.restore();
}

/** Whether a point (0..1) touches the stroke, within `radiusPx` on a W×H frame. */
export function touchesStroke(s: Stroke, x: number, y: number, W: number, H: number, radiusPx: number): boolean {
  const r = radiusPx + (s.width * W) / 2;
  return s.points.some(([px, py]) => Math.hypot((px - x) * W, (py - y) * H) <= r);
}
