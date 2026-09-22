import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { getReactionEmojis, listPosts } from "./api";
import { Composer } from "./Composer";
import { PostCard } from "./PostCard";
import type { Page, Post } from "./types";

export function FeedPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Page<Post> | null>(null);
  const [page, setPage] = useState(0);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReactionEmojis().then(setEmojis).catch(() => {});
  }, []);

  const load = useCallback(() => {
    listPosts(page, 10)
      .then(setData)
      .catch(() => setError("Impossible de charger le fil."));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleCreated() {
    if (page !== 0) setPage(0);
    else load();
  }

  function handleChanged(updated: Post) {
    setData((d) =>
      d ? { ...d, content: d.content.map((p) => (p.id === updated.id ? updated : p)) } : d,
    );
  }

  function handleDeleted() {
    load();
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="text-sm text-text-muted hover:underline">
          ← Accueil
        </Link>
        <h1 className="text-xl font-bold text-primary">Notre fil</h1>
      </div>

      <Composer onCreated={handleCreated} />

      {error && <p className="mt-4 text-danger">{error}</p>}

      <div className="mt-4 flex flex-col gap-4">
        {data?.content.length === 0 && (
          <p className="text-center text-text-muted">Aucun post pour l'instant. À toi de commencer 💌</p>
        )}
        {data?.content.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={user?.id}
            emojis={emojis}
            onChanged={handleChanged}
            onDeleted={handleDeleted}
          />
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-token border border-border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ← Précédent
          </button>
          <span className="text-sm text-text-muted">
            Page {page + 1} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => (p + 1 < data.totalPages ? p + 1 : p))}
            disabled={page + 1 >= data.totalPages}
            className="rounded-token border border-border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
