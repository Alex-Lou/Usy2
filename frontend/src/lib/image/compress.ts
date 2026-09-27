/**
 * Prepares a photo on the device before upload:
 * - downscales to MAX_DIMENSION and re-encodes as JPEG → a few hundred KB instead
 *   of 3-12 MB (fast on mobile data, fits the 5 MB server limit, and spares the
 *   database where images are stored);
 * - converts formats the server rejects (e.g. iPhone HEIC) whenever the browser
 *   can decode them;
 * - applies the EXIF orientation so photos are never sideways.
 * GIFs are kept untouched (animation). On any failure the original file is
 * returned and the server-side validation has the final word.
 */
const MAX_DIMENSION = 1920;
const QUALITY = 0.82;
const KEEP_IF_SMALLER_THAN = 400 * 1024;
const SERVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      /* fall back to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  const serverReady = SERVER_TYPES.includes(file.type);
  if (serverReady && file.size <= KEEP_IF_SMALLER_THAN) return file;

  let decoded: Decoded | null = null;
  try {
    decoded = await decode(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(decoded.source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob) return file;
    if (serverReady && blob.size >= file.size) return file; // never make it worse

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    decoded?.release();
  }
}
