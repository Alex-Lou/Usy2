import { useEffect, useRef, useState } from "react";
import { useInView } from "../../hooks/useInView";
import { ago } from "../couple/time";
import { getNewsImage, type NewsItem } from "./api";

export const KIND_ICON: Record<NewsItem["kind"], string> = { site: "📰", bluesky: "🦋", mastodon: "🐘", reddit: "👽", x: "𝕏" };

/** One article or post; the whole card opens it (in a new tab, nothing shared back). */
export function NewsCard({ item }: { item: NewsItem }) {
  const [ref, inView] = useInView<HTMLAnchorElement>();
  const [image, setImage] = useState<string | null>(null);
  const loaded = useRef<string | null>(null);

  // Fetched once near the screen, released when the card goes away.
  useEffect(() => () => {
    if (loaded.current) URL.revokeObjectURL(loaded.current);
  }, []);
  useEffect(() => {
    if (!inView || !item.image || loaded.current) return;
    let alive = true;
    getNewsImage(item.image)
      .then((u) => {
        if (!alive) return URL.revokeObjectURL(u);
        loaded.current = u;
        setImage(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [inView, item.image]);

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
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <span aria-hidden="true">{KIND_ICON[item.kind]}</span>
          <span className="font-semibold text-primary">{item.sourceLabel}</span>
          {post && item.author && <span className="truncate">· {item.author}</span>}
          {item.publishedAt && <span className="ml-auto shrink-0">{ago(item.publishedAt)}</span>}
        </p>
        {item.title && <h3 className="font-display text-base font-bold leading-snug text-text">{item.title}</h3>}
        {item.text && <p className={"text-sm text-text " + (post ? "whitespace-pre-wrap" : "line-clamp-3 text-text-muted")}>{item.text}</p>}
      </div>
    </a>
  );
}
