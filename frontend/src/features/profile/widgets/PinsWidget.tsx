import { useEffect, useState } from "react";
import { useInView } from "../../../hooks/useInView";
import { getLinkPreview, getLinkPreviewImage } from "../../../lib/api/linkPreview";
import type { Pin } from "../types";
import { domainOf, isWebAddress } from "./pinSuggestions";

/** One pinned site: the page's own picture when it has one (server-side preview), else its initial. */
export function PinCard({ pin, index }: { pin: Pin; index: number }) {
  const [ref, inView] = useInView<HTMLAnchorElement>();
  const [title, setTitle] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    getLinkPreview(pin.url)
      .then((p) => {
        if (cancelled) return;
        setTitle(p.siteName ?? p.title);
        if (p.hasImage) getLinkPreviewImage(p.url).then((src) => !cancelled && setImage(src)).catch(() => {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pin.url, inView]);

  const name = pin.label || title || domainOf(pin.url);
  const tilt = index % 2 === 0 ? -1.5 : 1.5;
  return (
    <a
      ref={ref}
      href={pin.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="pin-float group relative block press"
      style={{ ["--tilt" as string]: `${tilt}deg`, animationDelay: `${(index % 4) * 0.6}s` }}
    >
      <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 text-lg drop-shadow" aria-hidden="true">
        📌
      </span>
      <span className="block overflow-hidden rounded-token border border-border bg-surface shadow-md transition group-hover:shadow-lg">
        {image ? (
          <img src={image} alt="" decoding="async" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <span className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-primary/25 to-accent/25 font-display text-3xl font-bold text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="block px-2 py-1.5">
          <span className="block truncate text-sm font-semibold text-text">{name}</span>
          <span className="block truncate text-[11px] text-text-muted">{domainOf(pin.url)}</span>
        </span>
      </span>
    </a>
  );
}

/** Pinned sites as small floating cards: a quick-access board. Only http(s) links are shown. */
export function PinsWidget({ pins, label }: { pins: Pin[]; label?: string }) {
  const safe = pins.filter((p) => isWebAddress(p.url));
  if (safe.length === 0) return null;
  return (
    <section className="rounded-token border border-border bg-surface/60 p-3">
      <h3 className="mb-3 font-display text-base font-bold text-primary">{label || "Accès rapides"}</h3>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
        {safe.map((pin, i) => (
          <PinCard key={`${pin.url}-${i}`} pin={pin} index={i} />
        ))}
      </div>
    </section>
  );
}
