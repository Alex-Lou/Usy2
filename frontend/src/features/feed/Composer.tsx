import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../auth/useAuth";
import { createPost, uploadImage } from "./api";

export interface ComposerSeed {
  text: string;
  wantImage?: boolean;
  nonce: number;
}

export function Composer({
  onCreated,
  seed,
}: {
  onCreated: () => void;
  seed?: ComposerSeed;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // React to a picked "moment": prefill + focus, optionally open the picker.
  useEffect(() => {
    if (!seed) return;
    setText(seed.text);
    textareaRef.current?.focus();
    if (seed.wantImage) fileRef.current?.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.nonce]);

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
    <form onSubmit={submit} className="card p-4">
      <div className="flex gap-3">
        <Avatar name={user?.displayName ?? "?"} size={40} assetId={user?.avatarAssetId} species={user?.companion} />
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Quoi de neuf, mon cœur ?"
            maxLength={2000}
            rows={2}
            className="w-full resize-none bg-transparent text-text placeholder:text-text-muted outline-none"
          />
          {file && (
            <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
              <Icon name="images" size={16} />
              <span className="truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-danger hover:underline">
                retirer
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1">
          <label className="flex cursor-pointer items-center gap-2 rounded-token-sm px-2 py-1.5 text-sm font-medium text-text-muted transition hover:text-primary press">
            <Icon name="images" size={18} />
            Galerie
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-token-sm px-2 py-1.5 text-sm font-medium text-text-muted transition hover:text-primary press">
            <Icon name="camera" size={18} />
            Caméra
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <Button type="submit" disabled={busy || !text.trim()}>
          <Icon name="send" size={16} />
          {busy ? "Envoi…" : "Publier"}
        </Button>
      </div>
    </form>
  );
}
