import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../auth/useAuth";
import { uploadImage, type Asset } from "../../lib/api/assets";
import { GifPicker } from "../../components/rich/GifPicker";
import { AssetImage } from "../../components/AssetImage";
import { EffectLayer } from "../../components/photo/EffectLayer";
import { StudioDraftCard } from "../../components/photo/studio/DraftCard";
import type { StudioEdit } from "../../components/photo/studio/draft";
import { PhotoStudio } from "../../components/photo/studio/PhotoStudio";
import { createPost } from "./api";
import { MentionSuggest, usePeople } from "./mentions";
import { MomentsGrid, type Moment } from "./MomentsBar";

/** Photos in one post (a carousel); the server checks it too. */
const MAX_PHOTOS = 10;

/** A photo of the post being written: a file of the phone (retouchable), or a GIF of the search, already kept. */
interface Item {
  key: number;
  file?: File;
  asset?: Asset;
  effect: string | null;
  preview?: string; // the file's local thumbnail
}

let itemKeys = 0;
const fromFile = (file: File): Item => ({ key: ++itemKeys, file, effect: null, preview: URL.createObjectURL(file) });

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
  const people = usePeople();
  const [caret, setCaret] = useState(0);
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [studio, setStudio] = useState<number | null>(null); // the photo being retouched (its key)
  const [gifs, setGifs] = useState(false);
  const [progress, setProgress] = useState<string | null>(null); // « 2/5 » while photos go up
  const [resumed, setResumed] = useState<StudioEdit | undefined>(); // edits of a draft picked up
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [ideas, setIdeas] = useState(false); // the "✨ idée" prompts are shown
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The local thumbnails go when their photo does (and all of them when leaving).
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []);

  function add(more: Item[]) {
    const room = Math.max(0, MAX_PHOTOS - itemsRef.current.length);
    more.slice(room).forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    setError(more.length > room ? `${MAX_PHOTOS} photos au plus par publication.` : null);
    const kept = more.slice(0, room);
    if (kept.length > 0) setItems((now) => [...now, ...kept]);
  }

  function remove(key: number) {
    const gone = itemsRef.current.find((i) => i.key === key);
    if (gone?.preview) URL.revokeObjectURL(gone.preview);
    setItems((now) => now.filter((i) => i.key !== key));
  }

  /** Moves a photo one place earlier (the first one is the cover in the feed). */
  function earlier(key: number) {
    setItems((now) => {
      const at = now.findIndex((i) => i.key === key);
      if (at <= 0) return now;
      const next = [...now];
      [next[at - 1], next[at]] = [next[at], next[at - 1]];
      return next;
    });
  }

  function pick(input: HTMLInputElement) {
    add([...(input.files ?? [])].filter((f) => f.type.startsWith("image/")).map(fromFile));
    input.value = ""; // allow picking the same file again
  }

  // A photo alone is a valid post; text alone too.
  const canPublish = !busy && (text.trim().length > 0 || items.length > 0);
  const retouching = items.find((i) => i.key === studio);

  // React to a picked "moment": prefill + focus, optionally open the picker.
  useEffect(() => {
    if (!seed) return;
    setText(seed.text);
    if (seed.file) add([fromFile(seed.file)]);
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
      // One after the other: a phone on a weak network sends them more surely so.
      const ids: number[] = [];
      for (const [n, item] of items.entries()) {
        if (items.length > 1) setProgress(`${n + 1}/${items.length}`);
        ids.push(item.asset ? item.asset.id : (await uploadImage(item.file!, item.effect)).id);
      }
      await createPost(text, ids);
      setText("");
      items.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
      setItems([]);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Publication impossible.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  // One line until used, like "Quoi de neuf ?" on Facebook: the tools show once writing.
  const expanded = focused || ideas || text.length > 0 || items.length > 0 || busy;

  function pickIdea(m: Moment) {
    setIdeas(false);
    setText(m.text);
    textareaRef.current?.focus();
    if (m.wantImage) fileRef.current?.click();
  }

  const ideaButton = (
    <button
      type="button"
      onClick={() => setIdeas((v) => !v)}
      aria-expanded={ideas}
      aria-label="Une idée de post"
      title="Une idée de post"
      className={"grid h-10 w-10 shrink-0 place-items-center rounded-full transition press " + (ideas ? "seg-on" : "text-text-muted hover:text-primary")}
    >
      <Icon name="sparkles" size={19} />
    </button>
  );

  return (
    <form onSubmit={submit} className={"card " + (expanded ? "p-4" : "px-4 py-3")}>
      <StudioDraftCard
        onResume={(f, edits) => {
          const item = fromFile(f);
          add([item]);
          setResumed(edits);
          setStudio(item.key);
        }}
      />
      <div className={"flex gap-3 " + (expanded ? "" : "items-center")}>
        <Avatar name={user?.displayName ?? "?"} size={40} assetId={user?.avatarAssetId} framing={user?.avatarFraming} species={user?.companion} />
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setCaret(e.target.selectionStart ?? e.target.value.length);
            }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={expanded ? "Quoi de neuf ? (@ pour taguer)" : "Quoi de neuf ?"}
            maxLength={2000}
            rows={expanded ? 2 : 1}
            className="block w-full resize-none bg-transparent text-text placeholder:text-text-muted outline-none"
          />
          <MentionSuggest
            text={text}
            caret={caret}
            people={people}
            myId={user?.id}
            onPick={(next, pos) => {
              setText(next);
              setCaret(pos);
              requestAnimationFrame(() => {
                textareaRef.current?.focus();
                textareaRef.current?.setSelectionRange(pos, pos);
              });
            }}
          />
          {items.length > 0 && (
            // The photos in the order they will show; ◀ moves one earlier (the first is the cover).
            <div className="no-scrollbar -mr-1 mt-2 flex gap-2 overflow-x-auto pb-1">
              {items.map((item, n) => (
                <div key={item.key} className="relative h-28 shrink-0">
                  <EffectLayer effect={item.effect} className="h-28 rounded-token">
                    {item.preview ? (
                      <img src={item.preview} alt={`Photo ${n + 1}`} className="h-28 w-auto max-w-[10rem] rounded-token border border-border object-cover" />
                    ) : (
                      <AssetImage assetId={item.asset!.id} className="h-28 w-auto max-w-[10rem] rounded-token border border-border object-cover" />
                    )}
                  </EffectLayer>
                  <button
                    type="button"
                    onClick={() => remove(item.key)}
                    aria-label={`Retirer la photo ${n + 1}`}
                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white press"
                  >
                    <Icon name="x" size={14} />
                  </button>
                  {n > 0 && (
                    <button
                      type="button"
                      onClick={() => earlier(item.key)}
                      aria-label={`Mettre la photo ${n + 1} avant`}
                      className="absolute left-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white press"
                    >
                      <Icon name="chevronLeft" size={14} />
                    </button>
                  )}
                  {item.file && item.file.type !== "image/gif" && (
                    <button
                      type="button"
                      onClick={() => setStudio(item.key)}
                      aria-label={`Retoucher la photo ${n + 1}`}
                      className="absolute bottom-1 left-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white press"
                    >
                      <Icon name="sparkles" size={13} />
                    </button>
                  )}
                  {items.length > 1 && (
                    <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 text-[11px] font-semibold tabular-nums text-white">
                      {n + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {!expanded && ideaButton}
        {!expanded && (
          <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-text-muted transition hover:text-primary press" aria-label="Ajouter une photo">
            <Icon name="images" size={20} />
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => pick(e.target)} />
          </label>
        )}
      </div>

      {ideas && <MomentsGrid onPick={pickIdea} />}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {retouching?.file && (
        <PhotoStudio
          file={retouching.file}
          initial={resumed}
          keepDraft
          onCancel={() => {
            setStudio(null);
            setResumed(undefined);
          }}
          onDone={(edited, fx) => {
            setResumed(undefined);
            setItems((now) =>
              now.map((i) => {
                if (i.key !== retouching.key) return i;
                if (i.preview) URL.revokeObjectURL(i.preview);
                return { ...i, file: edited, effect: fx, preview: URL.createObjectURL(edited) };
              }),
            );
            setStudio(null);
          }}
        />
      )}
      {gifs && <GifPicker onPick={(asset) => add([{ key: ++itemKeys, asset, effect: null }])} onClose={() => setGifs(false)} />}

      {/* Clicking the tools must not blur the text (that would fold them away mid-click). */}
      <div
        onMouseDown={(e) => e.preventDefault()}
        className={"mt-3 items-center justify-between border-t border-border pt-3 " + (expanded ? "flex" : "hidden")}
      >
        <div className="flex items-center gap-1">
          {ideaButton}
          {/* Labels from sm: on a phone the icons leave room for "Publier". */}
          <label aria-label="Galerie" className="flex cursor-pointer items-center gap-2 rounded-token-sm px-2 py-1.5 text-sm font-medium text-text-muted transition hover:text-primary press">
            <Icon name="images" size={18} />
            <span className="hidden sm:inline">Galerie</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => pick(e.target)}
            />
          </label>
          <label aria-label="Caméra" className="flex cursor-pointer items-center gap-2 rounded-token-sm px-2 py-1.5 text-sm font-medium text-text-muted transition hover:text-primary press">
            <Icon name="camera" size={18} />
            <span className="hidden sm:inline">Caméra</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => pick(e.target)}
            />
          </label>
          <button
            type="button"
            onClick={() => setGifs(true)}
            aria-label="GIF"
            className="flex items-center gap-2 rounded-token-sm px-2 py-1.5 text-sm font-bold text-text-muted transition hover:text-primary press"
          >
            <span className="rounded border-2 border-current px-1 text-[10px] leading-tight">GIF</span>
          </button>
        </div>
        <Button type="submit" disabled={!canPublish}>
          <Icon name="send" size={16} />
          {busy ? (progress ? `Envoi ${progress}…` : "Envoi…") : "Publier"}
        </Button>
      </div>
    </form>
  );
}
