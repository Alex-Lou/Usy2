import type { CSSProperties } from "react";

/**
 * How an image sits in its frame (see Framing.java): it first fills the frame
 * (object-fit: cover), x/y (0–1) choose which part of the overflow shows and
 * zoom (0.5–4) enlarges it around that point, or shrinks it below 1 (the
 * empty edges then show a blurred copy, see needsBackdrop). The photo itself
 * is untouched.
 */
export interface Framing {
  x: number;
  y: number;
  zoom: number;
}

export const CENTRED: Framing = { x: 0.5, y: 0.5, zoom: 1 };
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;

/** Zoomed out: the photo no longer fills its frame, a blurred copy fills the rest. */
export function needsBackdrop(f: Framing | null | undefined): boolean {
  return !!f && f.zoom < 1;
}

/** The blurred copy behind a zoomed-out photo (slightly enlarged so the blur has no hard edge). */
export const BACKDROP_STYLE: CSSProperties = {
  objectFit: "cover",
  filter: "blur(14px) saturate(1.1) brightness(0.9)",
  transform: "scale(1.15)",
};

/**
 * Style for an <img> filling its (overflow-hidden) frame. object-position
 * picks the part, and scaling around that same point keeps it in place (when
 * zoomed out, x/y then say where the smaller photo sits in the frame).
 */
export function framingStyle(f: Framing | null | undefined): CSSProperties | undefined {
  if (!f) return undefined;
  const pos = `${f.x * 100}% ${f.y * 100}%`;
  return {
    objectFit: "cover",
    objectPosition: pos,
    transform: f.zoom !== 1 ? `scale(${f.zoom})` : undefined,
    transformOrigin: pos,
  };
}
