import { useEffect, useState } from "react";
import { useInView } from "../../hooks/useInView";
import { getLinkPreview, getLinkPreviewImage, type LinkPreviewData } from "../../lib/api/linkPreview";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * WhatsApp-style card under a post or message: thumbnail, site, title and a
 * bit of description; the whole card opens the link. Loaded only near the
 * screen; nothing is shown when the site gives nothing to preview.
 */
export function LinkPreview({ url, className = "" }: { url: string; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (!inView || data) return;
    let cancelled = false;
    getLinkPreview(url)
      .then((d) => !cancelled && setData(d))
      .catch(() => {
        /* no preview: the link in the text stays clickable */
      });
    return () => {
      cancelled = true;
    };
  }, [url, inView, data]);

  useEffect(() => {
    if (!data?.hasImage) return;
    let cancelled = false;
    getLinkPreviewImage(data.url)
      .then((src) => !cancelled && setImage(src))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data]);

  if (!data) return <div ref={ref} />;
  if (!data.title && !data.description) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={(e) => e.stopPropagation()}
      className={`block overflow-hidden rounded-token border border-border bg-surface-2 text-left text-text press ${className}`}
    >
      {data.hasImage && (image ? <img src={image} alt="" decoding="async" className="max-h-44 w-full object-cover" /> : <div className="h-32 animate-pulse bg-border" />)}
      <span className="block px-3 py-2">
        <span className="block truncate text-[11px] uppercase tracking-wide text-text-muted">{data.siteName ?? domainOf(url)}</span>
        {data.title && <span className="line-clamp-2 block font-semibold leading-snug">{data.title}</span>}
        {data.description && <span className="line-clamp-2 block text-sm text-text-muted">{data.description}</span>}
      </span>
    </a>
  );
}
