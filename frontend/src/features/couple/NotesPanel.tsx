import { useCallback, useEffect, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { onCoupleActivity } from "./activity";
import { deleteNote, listNotes } from "./api";
import { NoteComposer } from "./NoteComposer";
import type { Note } from "./types";
import { ago } from "./time";

/** Every note, newest first, with the composer on top. */
export function NotesPanel({ myId }: { myId: number | undefined }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback((p: number) => {
    listNotes(p, 20)
      .then((res) => {
        setPage(res.page);
        setTotalPages(res.totalPages);
        setNotes((prev) => (p === 0 || !prev ? res.content : [...prev, ...res.content]));
      })
      .catch(() => setNotes((prev) => prev ?? []));
  }, []);

  useEffect(() => {
    load(0);
    return onCoupleActivity((a) => a.kind === "note" && load(0));
  }, [load]);

  async function remove(id: number) {
    try {
      await deleteNote(id);
      setNotes((prev) => prev?.filter((n) => n.id !== id) ?? prev);
    } catch {
      /* stays listed */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <NoteComposer onSent={(n) => setNotes((prev) => [n, ...(prev ?? [])])} />
      {notes?.length === 0 && <p className="text-sm text-text-muted">Pas encore de mot.</p>}
      {notes?.map((n) => (
        <div key={n.id} className="flex items-start gap-2 rounded-token border border-border bg-surface px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap break-words text-text">{n.text}</p>
            <p className="text-[11px] text-text-muted">
              {n.author.displayName} · {ago(n.createdAt)}
            </p>
          </div>
          {n.author.id === myId && (
            <button
              type="button"
              onClick={() => remove(n.id)}
              className="press rounded-token p-1 text-text-muted hover:text-danger"
              aria-label="Supprimer le mot"
            >
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>
      ))}
      {page + 1 < totalPages && (
        <button type="button" onClick={() => load(page + 1)} className="chip press self-center hover:border-primary/50">
          Plus ancien
        </button>
      )}
    </div>
  );
}
