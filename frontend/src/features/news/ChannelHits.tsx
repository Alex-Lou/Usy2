import { useEffect, useState } from "react";
import { getNewsImage, type YoutubeChannel } from "./api";

/** A channel's picture, through the server (the phone never contacts YouTube). */
function ChannelPicture({ url }: { url: string | null }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    let got: string | null = null;
    getNewsImage(url)
      .then((u) => {
        got = u;
        if (alive) setSrc(u);
        else URL.revokeObjectURL(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (got) URL.revokeObjectURL(got);
    };
  }, [url]);
  return src ? (
    <img src={src} alt="" decoding="async" className="h-10 w-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-lg" aria-hidden="true">▶️</span>
  );
}

/** The channels found for my words: one tap adds that channel's Shorts. */
export function ChannelHits({ hits, busy, onPick }: { hits: YoutubeChannel[]; busy: boolean; onPick: (c: YoutubeChannel) => void }) {
  if (hits.length === 0) return <p className="text-xs text-text-muted">Aucune chaîne trouvée. Essaie un autre mot, ou colle son @pseudo.</p>;
  return (
    <ul className="flex flex-col gap-1" aria-label="Chaînes trouvées">
      {hits.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            disabled={busy}
            onClick={() => onPick(c)}
            className="flex w-full items-center gap-3 rounded-token border border-border px-3 py-2 text-left press hover:border-primary"
          >
            <ChannelPicture url={c.image} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{c.title}</span>
              <span className="truncate text-xs text-text-muted">{[c.handle, c.subscribers].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="chip shrink-0 text-xs">+ Suivre</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
