import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";
import { addComment, deleteComment, listComments } from "./api";
import type { Comment } from "./types";

export function Comments({
  postId,
  onCountChange,
}: {
  postId: number;
  onCountChange: (delta: number) => void;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listComments(postId, 0, 20)
      .then((p) => {
        if (!cancelled) {
          setItems(p.content);
          setTotalPages(p.totalPages);
          setPage(0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function loadMore() {
    const next = page + 1;
    const p = await listComments(postId, next, 20);
    setItems((prev) => [...prev, ...p.content]);
    setPage(next);
    setTotalPages(p.totalPages);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const c = await addComment(postId, text);
      setItems((prev) => [...prev, c]);
      setText("");
      onCountChange(1);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    await deleteComment(id);
    setItems((prev) => prev.filter((c) => c.id !== id));
    onCountChange(-1);
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex flex-col gap-2">
        {items.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
            <p>
              <span className="font-semibold text-primary">{c.author.displayName}</span>{" "}
              <span className="text-text">{c.text}</span>
            </p>
            {user?.id === c.author.id && (
              <button
                onClick={() => remove(c.id)}
                className="shrink-0 text-xs text-text-muted hover:text-danger"
                aria-label="Supprimer le commentaire"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {page + 1 < totalPages && (
          <button onClick={loadMore} className="self-start text-xs text-text-muted hover:underline">
            Voir plus de commentaires
          </button>
        )}
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder="Écrire un commentaire…"
          className="flex-1 rounded-token border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="rounded-token bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
