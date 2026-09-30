import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { ApiError } from "../../lib/api/client";
import { feel } from "../../lib/feel";
import { findNote, getHiddenNotes, hideNote, removeNote, type HiddenNote } from "./api";

const MAX = 280;
const stop = (e: MouseEvent) => e.stopPropagation();

/** The notes behind a photo, reloaded when the photo changes; nothing is fetched when not `enabled`. */
export function useHiddenNotes(assetId: number, enabled = true) {
  const [notes, setNotes] = useState<HiddenNote[]>([]);
  const [revealed, setRevealed] = useState<HiddenNote | null>(null);
  const reload = useCallback(() => {
    if (!enabled) return;
    getHiddenNotes(assetId).then(setNotes).catch(() => setNotes([]));
  }, [assetId, enabled]);
  useEffect(() => {
    setNotes([]);
    setRevealed(null);
    reload();
  }, [reload]);
  const found = useCallback((note: HiddenNote) => {
    setRevealed(note);
    setNotes((list) => list.map((n) => (n.id === note.id ? note : n)));
  }, []);
  return { notes, revealed, found, reload };
}

/** A spot on the photo that stays the same for a note (not in the middle of a face, hopefully). */
function spot(id: number) {
  return { left: `${12 + ((id * 37) % 70)}%`, top: `${12 + ((id * 53) % 66)}%` };
}

/**
 * 🐾 over the photo (place it inside a `relative` box around the image): the
 * other one's notes as paws to tap; once tapped, the note shows under the photo.
 */
export function PawLayer({ notes, onFound }: { notes: HiddenNote[]; onFound: (note: HiddenNote) => void }) {
  return (
    <>
      {notes
        .filter((n) => !n.mine)
        .map((n) => (
          <button
            key={n.id}
            type="button"
            aria-label={n.foundAt ? `Le mot caché de ${n.authorName}` : "Quelque chose se cache ici…"}
            onClick={(e) => {
              e.stopPropagation();
              feel.love();
              if (n.foundAt) onFound(n);
              else findNote(n.id).then(onFound).catch(() => {});
            }}
            className={"absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-2xl press " + (n.foundAt ? "bg-black/30" : "animate-pulse opacity-70 hover:opacity-100")}
            style={spot(n.id)}
          >
            🐾
          </button>
        ))}
    </>
  );
}

/**
 * Under the photo: the note just found, my own hidden notes (found or not, and
 * "Retirer"), and "🐾 Cacher un mot" to slip one behind this photo.
 */
export function HiddenNotesPanel({
  assetId,
  notes,
  revealed,
  onChanged,
}: {
  assetId: number;
  notes: HiddenNote[];
  revealed: HiddenNote | null;
  onChanged: () => void;
}) {
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = notes.filter((n) => n.mine);
  const waiting = mine.some((n) => !n.foundAt);

  async function hide() {
    setBusy(true);
    setError(null);
    try {
      await hideNote(assetId, text);
      setText("");
      setWriting(false);
      feel.tap();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? "Un de tes mots attend déjà ici." : "Le mot n'a pas pu être caché.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div onClick={stop} className="flex w-full max-w-md flex-col items-center gap-2 text-white">
      {revealed?.text && (
        <div className="w-full rounded-token bg-white/15 px-4 py-3 text-center animate-pop">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">🐾 Un mot caché de {revealed.authorName}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-lg leading-snug">{revealed.text}</p>
        </div>
      )}
      {mine.map((n) => (
        <p key={n.id} className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-white/80">
          <span>
            🐾 Ton mot « {n.text} » {n.foundAt ? `a été trouvé le ${new Date(n.foundAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} 💞` : "attend ici…"}
          </span>
          <button type="button" onClick={() => removeNote(n.id).then(onChanged).catch(() => {})} className="underline underline-offset-2 hover:text-white">
            Retirer
          </button>
        </p>
      ))}
      {writing ? (
        <div className="flex w-full flex-col gap-2">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX}
            rows={2}
            placeholder="Un petit mot à cacher derrière cette photo…"
            aria-label="Mot à cacher"
            className="w-full resize-none rounded-token-sm bg-white/15 px-3 py-2 text-white outline-none placeholder:text-white/50 focus:bg-white/20"
          />
          {error && <p className="text-center text-sm text-white">{error}</p>}
          <div className="flex justify-center gap-2">
            <button type="button" onClick={() => setWriting(false)} className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold press hover:bg-white/25">
              Annuler
            </button>
            <button type="button" onClick={hide} disabled={busy || !text.trim()} className="rounded-full btn-brand px-4 py-2 text-sm font-semibold press disabled:opacity-50">
              {busy ? "…" : "Cacher 🐾"}
            </button>
          </div>
        </div>
      ) : (
        !waiting && (
          <button type="button" onClick={() => setWriting(true)} className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold press hover:bg-white/25">
            🐾 Cacher un mot
          </button>
        )
      )}
    </div>
  );
}
