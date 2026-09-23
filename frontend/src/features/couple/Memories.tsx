import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AssetImage } from "../../components/AssetImage";
import { getMemories } from "./api";
import type { Memory } from "./types";

function yearsLabel(n: number): string {
  return n === 1 ? "Il y a 1 an" : `Il y a ${n} ans`;
}

/**
 * "Il y a 1 an": posts and photos from this day in earlier years. Renders
 * nothing when there are none, so it can sit anywhere without an empty box.
 */
export function Memories({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Memory[]>([]);

  useEffect(() => {
    getMemories().then(setItems).catch(() => {});
  }, []);

  if (items.length === 0) return null;
  const shown = compact ? items.slice(0, 6) : items;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Ce jour-là · {yearsLabel(items[0].yearsAgo)}
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        {shown.map((m) => {
          const body = (
            <>
              {m.assetId != null ? (
                <AssetImage assetId={m.assetId} className="h-24 w-24 rounded-token object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center overflow-hidden rounded-token bg-surface-2 p-2 text-xs text-text">
                  <span className="line-clamp-5">{m.text}</span>
                </div>
              )}
              <span className="mt-1 block w-24 truncate text-[11px] text-text-muted">
                {yearsLabel(m.yearsAgo)} · {m.authorName}
              </span>
            </>
          );
          return m.kind === "photo" && m.albumId != null ? (
            <Link key={`photo-${m.id}`} to={`/albums/${m.albumId}`} className="shrink-0 press">
              {body}
            </Link>
          ) : (
            <div key={`post-${m.id}`} className="shrink-0" title={m.text ?? undefined}>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
