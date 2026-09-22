import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "../../components/ui/Skeleton";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import { useAuth } from "../auth/useAuth";
import { getReactionEmojis, listPosts } from "./api";
import { Composer, type ComposerSeed } from "./Composer";
import { MomentsBar, type Moment } from "./MomentsBar";
import { PostCard } from "./PostCard";
import type { Post } from "./types";

export function FeedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Post[] | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [seed, setSeed] = useState<ComposerSeed | undefined>();
  const nonce = useRef(0);

  useEffect(() => {
    getReactionEmojis().then(setEmojis).catch(() => {});
  }, []);

  const load = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const p = await listPosts(pageNum, 10);
      setTotalPages(p.totalPages);
      setPage(p.page);
      setItems((prev) => (pageNum === 0 || !prev ? p.content : [...prev, ...p.content]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const hasMore = page + 1 < totalPages;
  const sentinel = useInfiniteScroll<HTMLDivElement>(() => {
    if (!loading && hasMore) load(page + 1);
  }, !loading && hasMore);

  function pickMoment(m: Moment) {
    nonce.current += 1;
    setSeed({ text: m.text, wantImage: m.wantImage, nonce: nonce.current });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="animate-fade-up">
        <p className="text-text-muted">Coucou {user?.displayName} 👋</p>
        <h1 className="font-display text-2xl font-bold">Votre fil</h1>
      </header>

      <MomentsBar onPick={pickMoment} />
      <Composer onCreated={() => load(0)} seed={seed} />

      {items === null ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <span className="text-4xl">💌</span>
          <p className="font-display text-xl font-bold">Rien encore ici</p>
          <p className="text-text-muted">Touche un « moment » ci-dessus ou écris le tout premier post.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              emojis={emojis}
              onChanged={(u) => setItems((prev) => prev?.map((p) => (p.id === u.id ? u : p)) ?? prev)}
              onDeleted={(id) => setItems((prev) => prev?.filter((p) => p.id !== id) ?? prev)}
            />
          ))}
          {hasMore && (
            <div ref={sentinel} className="py-4 text-center text-sm text-text-muted">
              {loading ? "Chargement…" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
