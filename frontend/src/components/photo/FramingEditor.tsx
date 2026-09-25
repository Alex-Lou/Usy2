import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { createPortal } from "react-dom";
import { getAssetUrl } from "../../lib/api/blobCache";
import { BACKDROP_STYLE, CENTRED, framingStyle, MAX_ZOOM, MIN_ZOOM, needsBackdrop, type Framing } from "../../lib/framing";
import { Icon } from "../ui/Icon";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Choose which part of a photo shows in its frame (avatar circle, cover
 * banner, album tile): drag to move, pinch / wheel / slider to zoom (in or
 * out: below 1× a blurred copy fills the frame's edges). Nothing
 * is cut: only the framing is returned, so it can be changed again later.
 */
export function FramingEditor({
  assetId,
  aspect,
  round = false,
  initial,
  title,
  onCancel,
  onSave,
}: {
  assetId: number;
  /** Frame width / height, like the place where the photo is shown. */
  aspect: number;
  round?: boolean;
  initial: Framing | null | undefined;
  title: string;
  onCancel: () => void;
  onSave: (framing: Framing) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [f, setF] = useState<Framing>(initial ?? CENTRED);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    let alive = true;
    getAssetUrl(assetId).then((url) => alive && setSrc(url)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [assetId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  /** Moving the finger by (dx, dy) px moves the photo by the same amount (see framing.ts). */
  function pan(dx: number, dy: number) {
    const el = frameRef.current;
    if (!el || !natural) return;
    const { width: W, height: H } = el.getBoundingClientRect();
    const cover = Math.max(W / natural.w, H / natural.h);
    setF((cur) => {
      // Hidden width at this zoom (negative when zoomed out: the free space; the same formula moves the photo inside it).
      const spanX = cur.zoom * natural.w * cover - W;
      const spanY = cur.zoom * natural.h * cover - H;
      return {
        ...cur,
        x: Math.abs(spanX) > 0.5 ? clamp(cur.x - dx / spanX, 0, 1) : cur.x,
        y: Math.abs(spanY) > 0.5 ? clamp(cur.y - dy / spanY, 0, 1) : cur.y,
      };
    });
  }

  function onPointerDown(e: RPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: f.zoom };
    }
  }

  function onPointerMove(e: RPointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size === 1) {
      pan(now.x - prev.x, now.y - prev.y);
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const start = pinch.current;
      setF((cur) => ({ ...cur, zoom: clamp((start.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / start.dist, MIN_ZOOM, MAX_ZOOM) }));
    }
  }

  function onPointerUp(e: RPointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black/85 p-4 animate-fade-up" role="dialog" aria-modal="true" aria-label={title}>
      <p className="font-display text-lg font-bold text-white">{title}</p>
      <div
        ref={frameRef}
        className={`relative w-full max-w-md cursor-grab touch-none select-none overflow-hidden bg-black/40 shadow-card ring-2 ring-white/70 active:cursor-grabbing ${round ? "max-w-[18rem] rounded-full" : "rounded-token"}`}
        style={{ aspectRatio: String(aspect) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => setF((cur) => ({ ...cur, zoom: clamp(cur.zoom * (1 - e.deltaY * 0.001), MIN_ZOOM, MAX_ZOOM) }))}
        aria-label="Glisse pour déplacer la photo"
      >
        {src && needsBackdrop(f) && (
          <img src={src} alt="" draggable={false} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" style={BACKDROP_STYLE} />
        )}
        {src ? (
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="pointer-events-none relative h-full w-full"
            style={framingStyle(f)}
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-white/10" />
        )}
      </div>
      <p className="text-center text-xs text-white/70">Glisse pour déplacer · pince ou utilise le curseur pour zoomer ou dézoomer</p>
      <label className="flex w-full max-w-md items-center gap-3 text-white">
        <span className="text-sm">Zoom</span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={f.zoom}
          onChange={(e) => setF((cur) => ({ ...cur, zoom: Number(e.target.value) }))}
          className="flex-1 accent-[var(--color-primary)]"
          aria-label="Zoom"
        />
      </label>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => setF(CENTRED)} className="flex items-center gap-1.5 rounded-full border border-white/40 px-4 py-2 text-sm text-white press">
          <Icon name="sparkles" size={14} /> Recentrer
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-white/40 px-4 py-2 text-sm text-white press">
          Annuler
        </button>
        <button type="button" onClick={() => onSave(f)} disabled={!natural} className="rounded-full btn-brand px-5 py-2 text-sm font-semibold disabled:opacity-50 press">
          Valider
        </button>
      </div>
    </div>,
    document.body,
  );
}
