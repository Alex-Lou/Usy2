import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AssetImage } from "../../components/AssetImage";
import { Icon } from "../../components/ui/Icon";
import { getMemories } from "./api";
import { yearsLabel } from "./Memories";
import type { Memory } from "./types";

// Shown once a day on each device; storage may be unavailable (then it shows at each launch).
const SEEN_KEY = "memocat.dailyMemory.seen";
const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, device's own day
function seenToday(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === today();
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, today());
  } catch {
    /* not remembered */
  }
}

function linkOf(m: Memory): string {
  return m.kind === "photo" && m.albumId != null ? `/albums/${m.albumId}` : `/posts/${m.id}`;
}

/**
 * « Souvenir du jour »: at the first opening of the day, this day's memories
 * from earlier years, full screen, one at a time. Nothing when there are none.
 */
export function DailyMemory() {
  const [items, setItems] = useState<Memory[]>([]);
  const [index, setIndex] = useState(0);
  const close = useCallback(() => setItems([]), []);

  useEffect(() => {
    if (seenToday()) return;
    let alive = true;
    getMemories()
      .then((found) => {
        if (!alive || found.length === 0) return;
        markSeen();
        setItems(found);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [items.length, close]);

  if (items.length === 0) return null;
  const m = items[Math.min(index, items.length - 1)];
  const date = new Date(m.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Souvenir du jour"
      data-daily-memory=""
      onClick={close}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/85 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(var(--safe-top)+1rem)] text-white animate-fade-up"
    >
      <div onClick={(e) => e.stopPropagation()} className="flex w-full max-w-md flex-col items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Souvenir du jour</p>
        <h2 className="font-display text-2xl font-bold">{yearsLabel(m.yearsAgo)} 💞</h2>

        {m.assetId != null ? (
          <AssetImage assetId={m.assetId} className="max-h-[52dvh] max-w-full rounded-token object-contain shadow-card" />
        ) : (
          <blockquote className="w-full rounded-token bg-white/10 p-5 text-lg leading-relaxed">
            <span className="line-clamp-[10] whitespace-pre-wrap break-words">{m.text}</span>
          </blockquote>
        )}
        {m.assetId != null && m.text && <p className="line-clamp-3 text-center text-sm text-white/90">{m.text}</p>}
        <p className="text-sm text-white/70">
          {m.authorName} · {date}
        </p>

        {items.length > 1 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Souvenir précédent"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 press hover:bg-white/20 disabled:opacity-30"
            >
              <Icon name="chevronLeft" size={20} />
            </button>
            <span className="text-sm tabular-nums text-white/80">
              {index + 1} / {items.length}
            </span>
            <button
              type="button"
              aria-label="Souvenir suivant"
              disabled={index === items.length - 1}
              onClick={() => setIndex((i) => i + 1)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 press hover:bg-white/20 disabled:opacity-30"
            >
              <Icon name="chevronLeft" size={20} className="rotate-180" />
            </button>
          </div>
        )}

        <div className="mt-1 flex gap-2">
          <Link to={linkOf(m)} onClick={close} className="btn-brand rounded-full px-5 py-2 text-sm font-semibold press">
            Voir
          </Link>
          <button type="button" onClick={close} className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold press hover:bg-white/20">
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
