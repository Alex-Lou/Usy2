import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/states";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import { useAuth } from "../auth/useAuth";
import { getAllProfiles } from "../profile/api";
import { onFeedActivity } from "./activity";
import { getReactionEmojis, listPosts } from "./api";
import { Composer, type ComposerSeed } from "./Composer";
import { CoupleStrip } from "./CoupleStrip";
import { MomentsBar, type Moment } from "./MomentsBar";
import { PostCard } from "./PostCard";
import { ShareChoice } from "./ShareChoice";
import { handToChat, takeSharedContent, type SharedContent } from "./sharedContent";
import type { Post } from "./types";

export function FeedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Post[] | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [seed, setSeed] = useState<ComposerSeed | undefined>();
  const [freshFrom, setFreshFrom] = useState<string | null>(null); // partner posted while here
  const [shared, setShared] = useState<SharedContent | null>(null); // waiting for "post or message?"
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const nonce = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    getReactionEmojis().then(setEmojis).catch(() => {});
  }, []);

  // Opened from another app's "Share" menu: ask whether it becomes a post or a message.
  useEffect(() => {
    takeSharedContent().then((content) => {
      if (window.location.search.includes("share=")) window.history.replaceState(null, "", "/");
      if (!content) return;
      setShared(content);
      getAllProfiles()
        .then((all) => setPartnerName(all.find((p) => p.userId !== user?.id)?.displayName ?? null))
        .catch(() => {});
    });
  }, [user?.id]);

  function shareAsPost() {
    if (!shared) return;
    nonce.current += 1;
    setSeed({ text: shared.text, file: shared.file, nonce: nonce.current });
    setShared(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function shareAsMessage() {
    if (!shared) return;
    handToChat(shared);
    setShared(null);
    navigate("/chat");
  }

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

  useEffect(() => onFeedActivity((a) => a.kind === "post" && setFreshFrom(a.actorName)), []);

  function showFresh() {
    setFreshFrom(null);
    void load(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
      </header>

      {freshFrom && (
        <button
          onClick={showFresh}
          className="sticky top-[calc(var(--topbar-h)+0.5rem)] z-20 mx-auto flex items-center gap-2 rounded-full btn-brand px-4 py-2 text-sm shadow-glow animate-pop lg:top-4"
        >
          <Icon name="sparkles" size={16} /> Nouveau post de {freshFrom} — Afficher
        </button>
      )}
      <CoupleStrip />
      <MomentsBar onPick={pickMoment} />
      <Composer onCreated={() => load(0)} seed={seed} />
      {shared && (
        <ShareChoice shared={shared} partnerName={partnerName} onPost={shareAsPost} onMessage={shareAsMessage} onCancel={() => setShared(null)} />
      )}

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
        <EmptyState title="Rien encore ici" subtitle="Touche un « moment » ci-dessus ou écris le tout premier post." />
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
