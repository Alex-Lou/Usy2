import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getAssetUrl } from "../../lib/api/blobCache";
import { Icon } from "../ui/Icon";

export interface Slide {
  assetId: number;
  caption?: string | null;
  /** ISO date shown under the caption. */
  date?: string | null;
}

const SLIDE_MS = 5000;

/**
 * Full-screen slideshow: soft crossfades, a slow zoom, captions. Tap the left
 * or right edge to go back or forward, the middle to pause. The screen stays
 * on while it plays (where the browser allows it).
 */
export function Slideshow({ slides, title, onClose }: { slides: Slide[]; title: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [prev, setPrev] = useState<number | null>(null); // the slide fading out under the new one

  const load = useCallback((i: number) => {
    const s = slides[i];
    if (!s) return;
    getAssetUrl(s.assetId)
      .then((url) => setUrls((u) => (u[s.assetId] ? u : { ...u, [s.assetId]: url })))
      .catch(() => {});
  }, [slides]);

  const go = useCallback(
    (to: number) => {
      if (slides.length === 0) return;
      const next = (to + slides.length) % slides.length; // loops at the end
      if (next === index) return;
      setPrev(index);
      setIndex(next);
    },
    [index, slides.length],
  );

  // This slide and the next one are fetched ahead, so a fade never shows a blank.
  useEffect(() => {
    load(index);
    load((index + 1) % slides.length);
  }, [index, load, slides.length]);

  const current = slides[index];
  const ready = current ? Boolean(urls[current.assetId]) : false;

  // Next slide after a while, once the current one is on screen.
  useEffect(() => {
    if (!playing || !ready || slides.length < 2) return;
    const t = window.setTimeout(() => go(index + 1), SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [playing, ready, index, go, slides.length]);

  // The old slide leaves once the new one has faded in.
  useEffect(() => {
    if (prev === null) return;
    const t = window.setTimeout(() => setPrev(null), 1500);
    return () => window.clearTimeout(t);
  }, [prev]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, index, onClose]);

  // Keep the screen on while it plays (unsupported or refused: nothing happens).
  const lock = useRef<{ release: () => Promise<void> } | null>(null);
  useEffect(() => {
    if (!playing) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    let alive = true;
    nav.wakeLock
      ?.request("screen")
      .then((l) => {
        if (alive) lock.current = l;
        else void l.release().catch(() => {});
      })
      .catch(() => {});
    return () => {
      alive = false;
      void lock.current?.release().catch(() => {});
      lock.current = null;
    };
  }, [playing]);

  if (!current) return null;
  const date = current.date
    ? new Date(current.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const layer = (i: number, entering: boolean) => {
    const url = urls[slides[i].assetId];
    if (!url) return null;
    return (
      <img
        key={i}
        src={url}
        alt=""
        className={"absolute inset-0 h-full w-full object-contain " + (entering ? "slide-in" + (playing ? "" : " paused") : "")}
      />
    );
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Diaporama : ${title}`} className="fixed inset-0 z-[70] select-none overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        {prev !== null && prev !== index && layer(prev, false)}
        {layer(index, true)}
        {!ready && <div className="absolute inset-0 grid place-items-center text-sm text-white/60">Chargement…</div>}
      </div>

      {/* Tap zones: back / pause / forward. */}
      <div className="absolute inset-0 flex">
        <button type="button" aria-label="Photo précédente" onClick={() => go(index - 1)} className="h-full w-[30%]" />
        <button type="button" aria-label={playing ? "Pause" : "Lecture"} onClick={() => setPlaying((p) => !p)} className="h-full flex-1" />
        <button type="button" aria-label="Photo suivante" onClick={() => go(index + 1)} className="h-full w-[30%]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 pb-8 pt-[calc(var(--safe-top)+0.75rem)]">
        <p className="min-w-0 flex-1 truncate font-display text-lg font-bold">{title}</p>
        <span className="text-sm tabular-nums text-white/80">
          {index + 1} / {slides.length}
        </span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause" : "Lecture"}
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/15 press hover:bg-white/25"
        >
          <Icon name={playing ? "pause" : "play"} size={18} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le diaporama"
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/15 press hover:bg-white/25"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      {(current.caption || date) && (
        <div
          key={index}
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-12 text-center animate-fade-up"
        >
          {current.caption && <p className="mx-auto line-clamp-3 max-w-xl text-lg leading-snug">{current.caption}</p>}
          {date && <p className="mt-1 text-sm text-white/70">{date}</p>}
        </div>
      )}
    </div>,
    document.body,
  );
}
