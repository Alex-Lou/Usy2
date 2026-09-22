import { useState } from "react";
import { ApiError } from "../../lib/api/client";
import { addPhoto, uploadImage } from "./api";

/**
 * Adds photos to an album. Uses the OS-native file picker via the webview:
 * "multiple" opens the gallery / existing folders, "capture" opens the camera
 * on mobile. Each file is uploaded then attached to the album.
 */
export function PhotoUploader({
  albumId,
  onUploaded,
}: {
  albumId: number;
  onUploaded: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: arr.length });
    try {
      for (let i = 0; i < arr.length; i++) {
        const asset = await uploadImage(arr[i]);
        await addPhoto(albumId, asset.id, null);
        setProgress({ done: i + 1, total: arr.length });
      }
      onUploaded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="rounded-token border border-border bg-surface p-4">
      <div className="flex flex-wrap gap-3">
        <label className="flex-1 cursor-pointer rounded-token bg-primary px-4 py-3 text-center font-semibold text-primary-foreground hover:opacity-90">
          🖼️ Choisir des photos
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
        <label className="flex-1 cursor-pointer rounded-token border border-primary px-4 py-3 text-center font-semibold text-primary hover:bg-bg">
          📷 Prendre une photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={busy}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>
      {progress && (
        <p className="mt-3 text-sm text-text-muted">
          Envoi… {progress.done}/{progress.total}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
