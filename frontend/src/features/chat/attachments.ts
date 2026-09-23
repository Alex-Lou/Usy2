import { fetchBlobUrl } from "../../lib/api/client";
import { uploadDocument, uploadImage, type Asset } from "../../lib/api/assets";

/** What the document picker offers (the server checks the real content). */
export const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export function isImage(asset: Pick<Asset, "contentType">): boolean {
  return asset.contentType.startsWith("image/");
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") && file.type !== "image/svg+xml";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

/** Early, friendly check before a long upload (the server re-checks everything). */
export function checkFile(file: File): string | null {
  if (!isImageFile(file) && file.size > MAX_DOCUMENT_BYTES) return "Fichier trop lourd (max 10 Mo)";
  return null;
}

/** Photos are compressed on the device (GIFs kept animated); documents go as-is. */
export function uploadAttachment(file: File, effect: string | null = null): Promise<Asset> {
  return isImageFile(file) ? uploadImage(file, effect) : uploadDocument(file);
}

function saveBlobUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Saves the file on the device under its original name. */
export async function downloadAsset(asset: Pick<Asset, "id" | "originalFilename">): Promise<void> {
  const url = await fetchBlobUrl(`/api/assets/${asset.id}`);
  saveBlobUrl(url, asset.originalFilename);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Opens a document: PDFs in the browser's own viewer (new tab), anything else
 * is downloaded. Nothing is rendered inside the app.
 */
export async function openDocument(asset: Asset): Promise<void> {
  const url = await fetchBlobUrl(`/api/assets/${asset.id}`);
  const tab = asset.contentType === "application/pdf" ? window.open(url, "_blank") : null;
  if (tab) tab.opener = null;
  else saveBlobUrl(url, asset.originalFilename);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
