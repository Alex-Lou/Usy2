import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../components/ui/Icon";

/** The 11-character id of a Short (youtube.com/shorts/ID), or null: nothing else is ever put in the player. */
// eslint-disable-next-line react-refresh/only-export-components
export function shortId(url: string): string | null {
  const m = /^https:\/\/www\.youtube\.com\/shorts\/([A-Za-z0-9_-]{11})$/.exec(url);
  return m ? m[1] : null;
}

/**
 * A Short, played inside the app in YouTube's privacy-enhanced (no-cookie)
 * player, full height on the phone. Closes with the button, a tap outside or
 * Escape. The player needs to know which site embeds it, hence its own
 * referrer policy (the app's is stricter).
 */
export function ShortPlayer({ id, title, url, onClose }: { id: string; title: string | null; url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title ?? "Short YouTube"} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4" onClick={onClose}>
      <div className="relative aspect-[9/16] h-[min(80dvh,calc((100vw-2rem)*16/9))]" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`}
          title={title ?? "Short YouTube"}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full rounded-token border-0 bg-black"
        />
      </div>
      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <a href={url} target="_blank" rel="noopener noreferrer" className="chip press text-sm text-white">
          Ouvrir dans YouTube
        </a>
        <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white press">
          <Icon name="x" size={20} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
