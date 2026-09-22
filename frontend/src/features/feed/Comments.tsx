import { useEffect, useState, type FormEvent } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { Icon } from "../../components/ui/Icon";
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
      <div className="flex flex-col gap-3">
        {items.map((c) => (
          <div key={c.id} className="flex items-start gap-2.5">
            <Avatar name={c.author.displayName} size={30} />
            <div className="flex-1 rounded-token rounded-tl-sm bg-bg-2/50 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-primary">{c.author.displayName}</span>
                {user?.id === c.author.id && (
                  <button onClick={() => remove(c.id)} aria-label="Supprimer" className="text-text-muted hover:text-danger press">
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
              <p className="text-sm">{c.text}</p>
            </div>
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
          className="flex-1 rounded-full border border-border bg-bg-2/60 px-4 py-2 text-sm outline-none focus:border-primary/70"
        />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Envoyer" className="grid h-10 w-10 place-items-center rounded-full btn-brand disabled:opacity-50 press">
          <Icon name="send" size={16} />
        </button>
      </form>
    </div>
  );
}
