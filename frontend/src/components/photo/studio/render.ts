import { applyAdjust, type Adjust } from "./adjust";

export interface Frame {
  rotation: 0 | 90 | 180 | 270;
  zoom: number; // >= 1, on top of "cover"
  panX: number; // offset in frame widths
  panY: number; // offset in frame heights
}

export interface Layer {
  id: number;
  kind: "emoji" | "sticker" | "text";
  value: string; // emoji char, sticker id, or text
  color?: string; // text only
  x: number; // centre, 0..1 of the frame
  y: number;
  scale: number; // size as a fraction of the frame width
  rotation: number; // degrees
}

export type Source = { image: CanvasImageSource; width: number; height: number };

export function rotatedSize(src: Source, rotation: number) {
  return rotation % 180 === 0 ? { w: src.width, h: src.height } : { w: src.height, h: src.width };
}

/** Scale that makes the (rotated) photo cover the frame, times the user's zoom. */
function coverScale(src: Source, f: Frame, W: number, H: number): number {
  const { w, h } = rotatedSize(src, f.rotation);
  return Math.max(W / w, H / h) * f.zoom;
}

/** Keeps the photo covering the whole frame whatever the pan/zoom. */
export function clampPan(src: Source, f: Frame, aspect: number): Frame {
  const W = aspect;
  const H = 1;
  const s = coverScale(src, f, W, H);
  const { w, h } = rotatedSize(src, f.rotation);
  const maxX = Math.max(0, (w * s - W) / (2 * W));
  const maxY = Math.max(0, (h * s - H) / (2 * H));
  return { ...f, panX: Math.min(maxX, Math.max(-maxX, f.panX)), panY: Math.min(maxY, Math.max(-maxY, f.panY)) };
}

/** Draws the framed photo (no colour adjustments) into a W×H context. */
export function drawPhoto(ctx: CanvasRenderingContext2D, src: Source, f: Frame, W: number, H: number): void {
  const s = coverScale(src, f, W, H);
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.translate(W / 2 + f.panX * W, H / 2 + f.panY * H);
  ctx.rotate((f.rotation * Math.PI) / 180);
  ctx.drawImage(src.image, (-src.width * s) / 2, (-src.height * s) / 2, src.width * s, src.height * s);
  ctx.restore();
}

function loadSvg(svg: SVGSVGElement, size: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/**
 * Flattens everything into a JPEG: framed photo, colour adjustments (pixel
 * maths identical to the preview), then stickers/emojis/text on top.
 * `stickerSvg` returns the on-screen SVG of a sticker layer.
 */
export async function exportPhoto(
  src: Source,
  frame: Frame,
  aspect: number,
  adjust: Adjust,
  layers: Layer[],
  stickerSvg: (id: number) => SVGSVGElement | null,
): Promise<Blob> {
  const { w, h } = rotatedSize(src, frame.rotation);
  const long = Math.min(1600, Math.max(w, h));
  const W = Math.round(aspect >= 1 ? long : long * aspect);
  const H = Math.round(aspect >= 1 ? long / aspect : long);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  drawPhoto(ctx, src, frame, W, H);
  const pixels = ctx.getImageData(0, 0, W, H);
  applyAdjust(pixels, adjust);
  ctx.putImageData(pixels, 0, 0);

  for (const l of layers) {
    const size = l.scale * W;
    ctx.save();
    ctx.translate(l.x * W, l.y * H);
    ctx.rotate((l.rotation * Math.PI) / 180);
    if (l.kind === "sticker") {
      const svg = stickerSvg(l.id);
      if (svg) ctx.drawImage(await loadSvg(svg, Math.round(size)), -size / 2, -size / 2, size, size);
    } else if (l.kind === "emoji") {
      ctx.font = `${size * 0.85}px ${EMOJI_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(l.value, 0, 0);
    } else {
      const px = size * 0.3;
      ctx.font = `800 ${px}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = px * 0.16;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.strokeText(l.value, 0, 0);
      ctx.fillStyle = l.color ?? "#ffffff";
      ctx.fillText(l.value, 0, 0);
    }
    ctx.restore();
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("export"))), "image/jpeg", 0.88),
  );
}

/** Decodes a picked photo, applying its EXIF orientation. */
export async function decodeSource(file: File): Promise<Source & { release: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { image: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      /* fall back to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return { image: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
}
