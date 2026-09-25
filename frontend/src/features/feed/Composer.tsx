import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../auth/useAuth";
import { uploadImage } from "../../lib/api/assets";
import { EffectLayer } from "../../components/photo/EffectLayer";
import { StudioDraftCard } from "../../components/photo/studio/DraftCard";
import type { StudioEdit } from "../../components/photo/studio/draft";
import { PhotoStudio } from "../../components/photo/studio/PhotoStudio";
import { createPost } from "./api";

export interface ComposerSeed {
  text: string;
  wantImage?: boolean;
  file?: File | null; // e.g. a photo shared from another app
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
  const [effect, setEffect] = useState<string | null>(null);
  const [studio, setStudio] = useState(false);
  const [resumed, setResumed] = useState<StudioEdit | undefined>(); // edits of a draft picked up
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Local thumbnail of the picked/taken photo (revoked when it changes).
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(input: HTMLInputElement) {
    setFile(input.files?.[0] ?? null);
    setEffect(null);
    input.value = ""; // allow picking the same file again
  }

  // A photo alone is a valid post; text alone too.
  const canPublish = !busy && (text.trim().length > 0 || file !== null);

  // React to a picked "moment": prefill + focus, optionally open the picker.
  useEffect(() => {
    if (!seed) return;
    setText(seed.text);
    if (seed.file) {
      setFile(seed.file);
      setEffect(null);
    }
    textareaRef.current?.focus();
    if (seed.wantImage) fileRef.current?.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.nonce]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canPublish) return;
    setBusy(true);
    setError(null);
    try {
      let imageAssetId: number | null = null;
      if (file) {
        const asset = await uploadImage(file, effect);
        imageAssetId = asset.id;
      }
      await createPost(text, imageAssetId);
      setText("");
      setFile(null);
      setEffect(null);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Publication impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-4">
      <StudioDraftCard
        onResume={(f, edits) => {
          setFile(f);
          setEffect(null);
          setResumed(edits);
          setStudio(true);
        }}
      />
      <div className="flex gap-3">
        <Avatar name={user?.displayName ?? "?"} size={40} assetId={user?.avatarAssetId} framing={user?.avatarFraming} species={user?.companion} />
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
          {preview && (
            <div className="relative mt-2 inline-block">
              <EffectLayer effect={effect} className="rounded-token">
                <img src={preview} alt="Aperçu de la photo" className="max-h-48 rounded-token border border-border object-cover" />
              </EffectLayer>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setEffect(null);
                }}
                aria-label="Retirer la photo"
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white press"
              >
                <Icon name="x" size={14} />
              </button>
              {file && file.type !== "image/gif" && (
                <button
                  type="button"
                  onClick={() => setStudio(true)}
                  className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white press"
                >
                  <Icon name="sparkles" size={13} /> Retoucher
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {studio && file && (
        <PhotoStudio
          file={file}
          initial={resumed}
          keepDraft
          onCancel={() => {
            setStudio(false);
            setResumed(undefined);
          }}
          onDone={(edited, fx) => {
            setResumed(undefined);
            setFile(edited);
            setEffect(fx);
            setStudio(false);
          }}
        />
      )}

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
              onChange={(e) => pick(e.target)}
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
              onChange={(e) => pick(e.target)}
            />
          </label>
        </div>
        <Button type="submit" disabled={!canPublish}>
          <Icon name="send" size={16} />
          {busy ? "Envoi…" : "Publier"}
        </Button>
      </div>
    </form>
  );
}
