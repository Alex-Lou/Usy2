import { useEffect, useRef, useState } from "react";
import { useInView } from "../../hooks/useInView";
import { ago } from "../couple/time";
import { getNewsImage, type NewsItem } from "./api";
import { ShortPlayer, shortId } from "./ShortPlayer";

export const KIND_ICON: Record<NewsItem["kind"], string> = { site: "📰", bluesky: "🦋", mastodon: "🐘", reddit: "👽", x: "𝕏", youtube: "▶️" };

/** An item's picture, fetched once near the screen and released when the card goes away. */
function useNewsImage<T extends Element>(url: string | null) {
  const [ref, inView] = useInView<T>();
  const [image, setImage] = useState<string | null>(null);
  const loaded = useRef<string | null>(null);

  useEffect(() => () => {
    if (loaded.current) URL.revokeObjectURL(loaded.current);
  }, []);
  useEffect(() => {
    if (!inView || !url || loaded.current) return;
    let alive = true;
    getNewsImage(url)
      .then((u) => {
        if (!alive) return URL.revokeObjectURL(u);
        loaded.current = u;
        setImage(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [inView, url]);
  return [ref, image] as const;
}

function Byline({ item }: { item: NewsItem }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-text-muted">
      <span aria-hidden="true">{KIND_ICON[item.kind]}</span>
      <span className="font-semibold text-primary">{item.sourceLabel}</span>
      {item.kind !== "site" && item.author && <span className="truncate">· {item.author}</span>}
      {item.publishedAt && <span className="ml-auto shrink-0">{ago(item.publishedAt)}</span>}
    </p>
  );
}

/** One article or post; the whole card opens it (in a new tab, nothing shared back). A Short plays right here. */
export function NewsCard({ item }: { item: NewsItem }) {
  if (item.kind === "youtube") return <ShortCard item={item} />;
  return <ArticleCard item={item} />;
}

function ArticleCard({ item }: { item: NewsItem }) {
  const [ref, image] = useNewsImage<HTMLAnchorElement>(item.image);
  const post = item.kind !== "site";
  return (
    <a
      ref={ref}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      data-news-item=""
      className="card flex flex-col overflow-hidden press hover:border-primary/50"
    >
      {item.image && (image ? <img src={image} alt="" decoding="async" className="max-h-56 w-full object-cover" /> : <div className="h-40 animate-pulse bg-surface-2" />)}
      <div className="flex flex-col gap-1.5 p-4">
        <Byline item={item} />
        {item.title && <h3 className="font-display text-base font-bold leading-snug text-text">{item.title}</h3>}
        {item.text && <p className={"text-sm text-text " + (post ? "whitespace-pre-wrap" : "line-clamp-3 text-text-muted")}>{item.text}</p>}
      </div>
    </a>
  );
}

function ShortCard({ item }: { item: NewsItem }) {
  const [ref, image] = useNewsImage<HTMLButtonElement>(item.image);
  const [playing, setPlaying] = useState(false);
  const id = shortId(item.url);
  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setPlaying(true)}
        disabled={!id}
        data-news-item=""
        aria-label={`Lire le Short : ${item.title ?? "vidéo"}`}
        className="card flex flex-col gap-3 p-4 text-left press hover:border-primary/50"
      >
        <Byline item={item} />
        <span className="relative mx-auto block aspect-[9/16] w-2/3 max-w-[15rem] overflow-hidden rounded-token bg-surface-2">
          {image && <img src={image} alt="" decoding="async" className="h-full w-full object-cover" />}
          <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 text-2xl text-white shadow-lg">▶</span>
          </span>
        </span>
        {item.title && <h3 className="font-display text-base font-bold leading-snug text-text">{item.title}</h3>}
      </button>
      {playing && id && <ShortPlayer id={id} title={item.title} url={item.url} onClose={() => setPlaying(false)} />}
    </>
  );
}
