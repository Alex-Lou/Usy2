import { useRef, useState, type ReactNode } from "react";
import { AssetImage } from "../../components/AssetImage";
import { EffectLayer } from "../../components/photo/EffectLayer";
import { Icon } from "../../components/ui/Icon";
import type { Photo } from "./types";

/** The frame follows the first photo, within Instagram's bounds (no endless strip, no tall needle). */
function frameRatio(p: Photo | undefined): number {
  const r = p?.width && p?.height ? p.width / p.height : 4 / 3;
  return Math.min(1.91, Math.max(0.8, r));
}

/**
 * A post's photos, edge to edge in the card: a finger slides from one to the next (the browser's
 * own scrolling, snapped photo by photo), with « 2/5 » and dots to know where one is; arrows with a
 * mouse. A tap on a photo: {@code onTap(index)} (enlarge it, or ❤️ on a double tap).
 * {@code overlay}: drawn over the photo shown (the ❤️ burst).
 */
export function PhotoCarousel({ photos, onTap, overlay }: { photos: Photo[]; onTap: (index: number) => void; overlay?: ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const many = photos.length > 1;
  const go = (i: number) => {
    const el = strip.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="relative -mx-4 mt-3 w-[calc(100%+2rem)]">
      <div
        ref={strip}
        onScroll={(e) => setAt(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        style={{ aspectRatio: String(frameRatio(photos[0])), maxHeight: "32rem" }}
      >
        {photos.map((p, i) => (
          <button
            key={`${p.assetId}-${i}`}
            type="button"
            onClick={() => onTap(i)}
            className="relative h-full w-full shrink-0 snap-center snap-always touch-manipulation bg-bg-2"
            aria-label={many ? `Photo ${i + 1} sur ${photos.length} : agrandir (deux fois : ❤️)` : "Agrandir la photo (deux fois : ❤️)"}
          >
            <EffectLayer effect={p.effect} className="h-full w-full [&>div]:h-full">
              <AssetImage assetId={p.assetId} className="h-full w-full object-cover" />
            </EffectLayer>
          </button>
        ))}
      </div>
      {overlay}
      {many && (
        <>
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
            {at + 1}/{photos.length}
          </span>
          {at > 0 && (
            <button
              type="button"
              onClick={() => go(at - 1)}
              aria-label="Photo précédente"
              className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white press hover:bg-black/60 [@media(pointer:fine)]:grid"
            >
              <Icon name="chevronLeft" size={20} />
            </button>
          )}
          {at < photos.length - 1 && (
            <button
              type="button"
              onClick={() => go(at + 1)}
              aria-label="Photo suivante"
              className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white press hover:bg-black/60 [@media(pointer:fine)]:grid"
            >
              <Icon name="chevronLeft" size={20} className="rotate-180" />
            </button>
          )}
          <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
            {photos.map((p, i) => (
              <span
                key={`${p.assetId}-${i}`}
                className={"h-1.5 rounded-full transition-all " + (i === at ? "w-4 bg-primary" : "w-1.5 bg-text-muted/40")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
