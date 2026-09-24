import type { CSSProperties } from "react";

/**
 * How an image sits in its frame (see Framing.java): it first fills the frame
 * (object-fit: cover), x/y (0–1) choose which part of the overflow shows and
 * zoom (1–4) enlarges it around that point. The photo itself is untouched.
 */
export interface Framing {
  x: number;
  y: number;
  zoom: number;
}

export const CENTRED: Framing = { x: 0.5, y: 0.5, zoom: 1 };
export const MAX_ZOOM = 4;

/**
 * Style for an <img> filling its (overflow-hidden) frame. object-position
 * picks the part, and scaling around that same point keeps it in place.
 */
export function framingStyle(f: Framing | null | undefined): CSSProperties | undefined {
  if (!f) return undefined;
  const pos = `${f.x * 100}% ${f.y * 100}%`;
  return {
    objectFit: "cover",
    objectPosition: pos,
    transform: f.zoom > 1 ? `scale(${f.zoom})` : undefined,
    transformOrigin: pos,
  };
}
