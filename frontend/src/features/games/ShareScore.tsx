import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ApiError } from "../../lib/api/client";
import { createPost } from "../feed/api";

const MAX_TEXT = 2000; // same limit as the server's posts

/**
 * « 📣 Partager sur le fil »: opens a post already written from the game's
 * result, to edit before publishing. Nothing is posted without that click.
 */
export function ShareScore({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postId, setPostId] = useState<number | null>(null);

  if (postId != null) {
    return <Link to={`/posts/${postId}`} className={"chip press text-sm font-semibold " + className}>✓ Partagé · voir le post</Link>;
  }

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const post = await createPost(draft.trim(), null);
      setPostId(post.id);
      setOpen(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Pas publié, réessaie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(text);
          setOpen(true);
        }}
        className={"chip press text-sm font-semibold " + className}
      >
        📣 Partager sur le fil
      </button>
      {open && createPortal(
        // Portal: out of the game's overlays; events stop here so a game's pointer handlers don't see them.
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Partager sur le fil"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="card flex w-full max-w-sm flex-col gap-3 p-4 text-left animate-pop">
            <h2 className="font-display text-lg font-bold">📣 Partager sur notre fil</h2>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_TEXT))}
              rows={4}
              maxLength={MAX_TEXT}
              aria-label="Texte du post"
              className="w-full resize-y rounded-token border border-border bg-surface-2 px-3 py-2 text-sm"
            />
            {error && <p className="text-xs text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="chip press text-sm">Annuler</button>
              <button type="button" onClick={() => void publish()} disabled={busy || !draft.trim()} className="btn-brand press rounded-token px-4 py-1.5 text-sm font-semibold disabled:opacity-40">
                {busy ? "…" : "Publier"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
