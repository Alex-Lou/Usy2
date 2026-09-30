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

const SLIDE_MS = 5000; // at normal speed; ×2 halves it
const AHEAD = 3; // photos fetched and decoded ahead of the one on screen

type Loaded = { url: string } | { failed: true };

/**
 * Fetches a photo and decodes it off screen, so it appears in one piece (no
 * half-drawn image, no decoding hitch during the fade). The object URL belongs
 * to the shared cache (blobCache), which frees it; nothing to revoke here.
 */
async function prepare(assetId: number): Promise<string> {
  const url = await getAssetUrl(assetId);
  const img = new Image();
  img.src = url;
  await img.decode().catch(() => {}); // an image the browser cannot pre-decode still shows
  return url;
}

/**
 * Full-screen slideshow: soft crossfades, a slow zoom, captions, and at the
 * bottom Pause / Lecture / ×2. Tap the left or right edge to go back or
 * forward. A photo only comes on screen once it is loaded and decoded; one
 * that cannot load is skipped. Only the photos around the current one are
 * kept, however long the slideshow. The screen stays on while it plays.
 */
export function Slideshow({ slides, title, onClose }: { slides: Slide[]; title: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [fast, setFast] = useState(false);
  const [loaded, setLoaded] = useState<Map<number, Loaded>>(new Map()); // by asset id, around the current one
  const [prev, setPrev] = useState<number | null>(null); // the slide fading out under the new one
  const [due, setDue] = useState(false); // time for the next photo, waiting for it to be ready
  const pending = useRef(new Set<number>());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const count = slides.length;
  const at = useCallback((i: number) => slides[((i % count) + count) % count], [slides, count]);

  // Fetch the current photo and the next few; forget those far behind (the cache frees them).
  useEffect(() => {
    if (count === 0) return;
    const keep = new Set<number>();
    for (let d = -1; d <= AHEAD; d++) keep.add(at(index + d).assetId);
    setLoaded((m) => {
      const stale = [...m.keys()].filter((id) => !keep.has(id));
      if (stale.length === 0) return m;
      const next = new Map(m);
      stale.forEach((id) => next.delete(id));
      return next;
    });
    for (const id of keep) {
      if (loaded.has(id) || pending.current.has(id)) continue;
      pending.current.add(id);
      prepare(id)
        .catch(() => prepare(id)) // one retry: a slow network drops a request now and then
        .then(
          (url) => ({ url }) as Loaded,
          () => ({ failed: true }) as Loaded,
        )
        .then((result) => {
          pending.current.delete(id);
          if (alive.current) setLoaded((m) => new Map(m).set(id, result));
        });
    }
  }, [index, at, count, loaded]);

  const go = useCallback(
    (to: number) => {
      if (count === 0) return;
      const next = ((to % count) + count) % count; // loops at the end
      setDue(false);
      if (next === index) return;
      setPrev(index);
      setIndex(next);
    },
    [index, count],
  );

  const current = at(index);
  const state = current ? loaded.get(current.assetId) : undefined;
  const nextState = current ? loaded.get(at(index + 1).assetId) : undefined;
  const shown = state && "url" in state;

  // A photo that could not load is skipped.
  useEffect(() => {
    if (state && "failed" in state && count > 1) {
      const t = window.setTimeout(() => go(index + 1), 300);
      return () => window.clearTimeout(t);
    }
  }, [state, count, go, index]);

  // Once this photo has been on screen long enough, the next one is due…
  useEffect(() => {
    if (!playing || !shown || count < 2) return;
    const t = window.setTimeout(() => setDue(true), fast ? SLIDE_MS / 2 : SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [playing, shown, index, fast, count]);

  // …and comes as soon as it is ready (never a black screen while it downloads).
  useEffect(() => {
    if (due && playing && nextState) go(index + 1);
  }, [due, playing, nextState, go, index]);

  // The old slide leaves once the new one has faded in.
  useEffect(() => {
    if (prev === null) return;
    const t = window.setTimeout(() => setPrev(null), fast ? 800 : 1300);
    return () => window.clearTimeout(t);
  }, [prev, fast]);

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

  // Keep the screen on while it plays (unsupported or refused: nothing happens). The
  // browser drops the lock when the app goes to the background: asked again on return.
  useEffect(() => {
    if (!playing) return;
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Lock> } };
    let lock: Lock | null = null;
    let active = true;
    const request = () => {
      if (document.visibilityState !== "visible") return;
      nav.wakeLock
        ?.request("screen")
        .then((l) => {
          if (active) lock = l;
          else void l.release().catch(() => {});
        })
        .catch(() => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => {});
    };
  }, [playing]);

  if (!current) return null;
  const date = current.date
    ? new Date(current.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const layer = (i: number, entering: boolean) => {
    const s = loaded.get(at(i).assetId);
    if (!s || !("url" in s)) return null;
    return (
      <img
        key={i}
        src={s.url}
        alt=""
        decoding="async"
        className={"absolute inset-0 h-full w-full object-contain " + (entering ? "slide-in" + (playing ? "" : " paused") : "")}
        style={entering && fast ? ({ "--slide-fade": "0.7s", "--slide-zoom": "3s" } as React.CSSProperties) : undefined}
      />
    );
  };

  const control = (on: boolean) =>
    "flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold press " +
    (on ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25");

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Diaporama : ${title}`} className="fixed inset-0 z-[70] select-none overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        {prev !== null && prev !== index && layer(prev, false)}
        {layer(index, true)}
        {!shown && <div className="absolute inset-0 grid place-items-center text-sm text-white/60">Chargement…</div>}
      </div>

      {/* Tap zones: back / pause-play / forward. */}
      <div className="absolute inset-0 flex">
        <button type="button" aria-label="Photo précédente" onClick={() => go(index - 1)} className="h-full w-[30%]" />
        <button type="button" aria-label={playing ? "Mettre en pause" : "Reprendre"} onClick={() => setPlaying((p) => !p)} className="h-full flex-1" />
        <button type="button" aria-label="Photo suivante" onClick={() => go(index + 1)} className="h-full w-[30%]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 pb-8 pt-[calc(var(--safe-top)+0.75rem)]">
        <p className="min-w-0 flex-1 truncate font-display text-lg font-bold">{title}</p>
        <span className="text-sm tabular-nums text-white/80">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le diaporama"
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/15 press hover:bg-white/25"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/75 to-transparent px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-12 text-center">
        {(current.caption || date) && (
          <div key={index} className="animate-fade-up">
            {current.caption && <p className="mx-auto line-clamp-3 max-w-xl text-lg leading-snug">{current.caption}</p>}
            {date && <p className="mt-1 text-sm text-white/70">{date}</p>}
          </div>
        )}
        <div className="pointer-events-auto flex gap-2">
          <button type="button" onClick={() => setPlaying(false)} aria-pressed={!playing} className={control(!playing)}>
            <Icon name="pause" size={16} /> Pause
          </button>
          <button type="button" onClick={() => setPlaying(true)} aria-pressed={playing} className={control(playing)}>
            <Icon name="play" size={16} /> Lecture
          </button>
          <button type="button" onClick={() => setFast((f) => !f)} aria-pressed={fast} aria-label="Vitesse ×2" className={control(fast)}>
            ×2
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
