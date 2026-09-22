import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { ApiError } from "../../lib/api/client";
import { createPost, uploadImage } from "./api";

export function Composer({ onCreated }: { onCreated: () => void }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      let imageAssetId: number | null = null;
      if (file) {
        const asset = await uploadImage(file);
        imageAssetId = asset.id;
      }
      await createPost(text, imageAssetId);
      setText("");
      setFile(null);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Publication impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-token border border-border bg-surface p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Quoi de neuf ?"
        maxLength={2000}
        rows={3}
        className="w-full resize-none rounded-token border border-border bg-surface px-3 py-2 text-text outline-none focus:border-primary"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="cursor-pointer text-sm text-text-muted hover:underline">
          {file ? `📎 ${file.name}` : "📎 Ajouter une image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex items-center gap-2">
          {file && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-sm text-text-muted hover:text-danger"
            >
              retirer
            </button>
          )}
          <Button type="submit" disabled={busy || !text.trim()}>
            {busy ? "Publication…" : "Publier"}
          </Button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </form>
  );
}
