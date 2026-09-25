import type { CSSProperties } from "react";
import { FONTS, loadFont } from "../../../lib/fonts";
import type { FontKey } from "../../../features/profile/types";

/**
 * Styled text for the studio: a font and a look (outline, shadow, bubble,
 * neon, meme — the classic white capitals with a thick black edge, whatever
 * the font chosen). `textCss` styles the on-screen text and `paintText` draws the same
 * on the exported photo. `px` is the font size.
 */
export type TextLook = "outline" | "shadow" | "bubble" | "neon" | "meme";

export const TEXT_LOOKS: { id: TextLook; label: string }[] = [
  { id: "outline", label: "Contour" },
  { id: "shadow", label: "Ombre" },
  { id: "bubble", label: "Bulle" },
  { id: "neon", label: "Néon" },
  { id: "meme", label: "Mème" },
];

const MEME_FONT = "Impact, Haettenschweiler, 'Arial Narrow Bold', 'Arial Black', sans-serif";

export const STUDIO_FONTS: FontKey[] = ["app", "fredoka", "pacifico", "dancing", "caveat", "patrick", "playfair", "cinzel", "courier"];

const ROUNDED = "ui-rounded, system-ui, sans-serif";

export function fontFamily(font: FontKey | undefined): string {
  return (font && font !== "app" && FONTS[font]?.stack) || ROUNDED;
}

function weight(font: FontKey | undefined): number {
  return !font || font === "app" ? 800 : 700;
}

/** Text readable on a bubble of this colour. */
function onColor(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#1a1530" : "#ffffff";
}

export function textCss(color: string, font: FontKey | undefined, look: TextLook, px: number): CSSProperties {
  const base: CSSProperties = { fontFamily: fontFamily(font), fontWeight: weight(font), fontSize: px, lineHeight: 1, whiteSpace: "nowrap" };
  switch (look) {
    case "shadow":
      return { ...base, color, textShadow: `${px * 0.06}px ${px * 0.06}px ${px * 0.12}px rgba(0,0,0,0.6)` };
    case "bubble":
      return { ...base, color: onColor(color), background: color, padding: `${px * 0.25}px ${px * 0.45}px`, borderRadius: px * 0.6 };
    case "neon":
      return { ...base, color: "#ffffff", textShadow: `0 0 ${px * 0.175}px ${color}, 0 0 ${px * 0.35}px ${color}` };
    case "meme":
      return { ...base, fontFamily: MEME_FONT, fontWeight: 900, textTransform: "uppercase", color: "#ffffff", WebkitTextStroke: `${px * 0.1}px #000`, paintOrder: "stroke", letterSpacing: "0.01em" };
    default:
      return { ...base, color, WebkitTextStroke: `${px * 0.08}px rgba(0,0,0,0.55)`, paintOrder: "stroke" };
  }
}

/** Makes sure the web font is ready before painting it on a canvas. */
export async function ensureFont(font: FontKey | undefined, px: number): Promise<void> {
  if (!font || font === "app" || typeof document === "undefined" || !document.fonts) return;
  loadFont(font);
  try {
    await document.fonts.load(`${weight(font)} ${Math.round(px)}px ${fontFamily(font)}`);
  } catch {
    /* falls back to the next font of the stack */
  }
}

/** Draws the text centred on (0, 0) of the (already moved and rotated) context. */
export function paintText(ctx: CanvasRenderingContext2D, value: string, color: string, font: FontKey | undefined, look: TextLook, px: number): void {
  ctx.save();
  ctx.font = look === "meme" ? `900 ${px}px ${MEME_FONT}` : `${weight(font)} ${px}px ${fontFamily(font)}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  if (look === "bubble") {
    const w = ctx.measureText(value).width + px * 0.9;
    const h = px * 1.5;
    const r = Math.min(px * 0.6, h / 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + r, -h / 2);
    ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
    ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
    ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
    ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = onColor(color);
    ctx.fillText(value, 0, 0);
  } else if (look === "shadow") {
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowOffsetX = px * 0.06;
    ctx.shadowOffsetY = px * 0.06;
    ctx.shadowBlur = px * 0.12;
    ctx.fillStyle = color;
    ctx.fillText(value, 0, 0);
  } else if (look === "meme") {
    const caps = value.toUpperCase();
    ctx.lineWidth = px * 0.2;
    ctx.strokeStyle = "#000";
    ctx.strokeText(caps, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(caps, 0, 0);
  } else if (look === "neon") {
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = color;
    for (const blur of [px * 0.35, px * 0.175]) {
      ctx.shadowBlur = blur;
      ctx.fillText(value, 0, 0);
    }
  } else {
    ctx.lineWidth = px * 0.16;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.strokeText(value, 0, 0);
    ctx.fillStyle = color;
    ctx.fillText(value, 0, 0);
  }
  ctx.restore();
}
