import { useState } from "react";
import { PhotoStudio } from "../../components/photo/studio/PhotoStudio";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api/client";
import { uploadImage } from "../../lib/api/assets";
import { addPhoto } from "./api";

/**
 * Adds photos to an album via the OS-native file picker in the webview:
 * "multiple" opens the gallery / existing folders, "capture" opens the camera.
 * A single photo first opens the studio (crop, filters, stickers…); several
 * photos are added as they are.
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
  const [studioFile, setStudioFile] = useState<File | null>(null);

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    if (arr.length === 1 && arr[0].type !== "image/gif") setStudioFile(arr[0]);
    else void upload(arr, null);
  }

  async function upload(arr: File[], effect: string | null) {
    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: arr.length });
    try {
      for (let i = 0; i < arr.length; i++) {
        const asset = await uploadImage(arr[i], effect);
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
    <div className="card p-4">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-token btn-brand px-4 py-3 font-semibold press">
          <Icon name="images" size={18} />
          Choisir des photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = ""; // the same photo can be chosen again
            }}
          />
        </label>
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-token border border-primary/60 px-4 py-3 font-semibold text-primary press hover:bg-primary/10">
          <Icon name="camera" size={18} />
          Prendre une photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {progress && <p className="mt-3 text-sm text-text-muted">Envoi… {progress.done}/{progress.total}</p>}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {studioFile && (
        <PhotoStudio
          file={studioFile}
          onCancel={() => setStudioFile(null)}
          onDone={(edited, effect) => {
            setStudioFile(null);
            void upload([edited], effect);
          }}
        />
      )}
    </div>
  );
}
