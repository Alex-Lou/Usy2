import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../features/auth/useAuth";
import { downloadAsset } from "../../features/chat/attachments";
import { HiddenNotesPanel, PawLayer, useHiddenNotes } from "../../features/hidden/HiddenNotes";
import { setProfilePhoto } from "../../features/profile/api";
import type { Asset } from "../../lib/api/assets";
import { AssetImage } from "../AssetImage";
import { Icon } from "../ui/Icon";

/**
 * Full-screen photo/GIF viewer (chat, feed, profile) with a download button and
 * "use as my profile photo / cover". Esc or tap outside closes.
 * `badge`: drawn over the photo's bottom-right corner (e.g. the companion on an avatar).
 * `hiddenNotes`: a post's photo, where a 🐾 note can be hidden or found.
 * `gallery`: one photo of several (a post's carousel): « 2/5 », arrows, a finger sliding sideways
 * or ← → go to the others.
 * Rendered on <body>: an animated (transformed) card would otherwise trap `position: fixed`.
 */
export function ImageViewer({
  asset,
  onClose,
  badge,
  hiddenNotes = false,
  gallery,
}: {
  asset: Pick<Asset, "id" | "originalFilename">;
  onClose: () => void;
  badge?: ReactNode;
  hiddenNotes?: boolean;
  gallery?: { index: number; count: number; onGo: (index: number) => void };
}) {
  const hidden = useHiddenNotes(asset.id, hiddenNotes);
  const { refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const go = (delta: number) => {
    if (!gallery) return;
    const next = gallery.index + delta;
    if (next >= 0 && next < gallery.count) gallery.onGo(next);
  };
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goRef.current(-1);
      else if (e.key === "ArrowRight") goRef.current(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  // A finger sliding sideways: the next photo (to the left) or the previous one.
  const swipe = useRef<{ x: number; y: number } | null>(null);

  async function applyToProfile(kind: "avatar" | "cover") {
    setSaving(true);
    setMessage(null);
    try {
      await setProfilePhoto(kind, asset.id);
      setMessage(kind === "avatar" ? "✓ C'est ta photo de profil" : "✓ C'est ta couverture de profil");
      if (kind === "avatar") void refreshUser().catch(() => {}); // header/avatar reflect the new photo
    } catch {
      setMessage("La photo n'a pas pu être utilisée pour ton profil.");
    } finally {
      setSaving(false);
    }
  }

  const action = "rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white press hover:bg-white/25 disabled:opacity-50";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-50 flex flex-col bg-black/90 animate-fade-up"
      onClick={onClose}
    >
      <div className="flex justify-end gap-2 px-4 pb-2 pt-[calc(var(--safe-top)+0.75rem)]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void downloadAsset(asset);
          }}
          aria-label="Enregistrer"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white press hover:bg-white/20"
        >
          <Icon name="download" size={20} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white press hover:bg-white/20"
        >
          <Icon name="x" size={20} />
        </button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center p-4"
        onTouchStart={(e) => (swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const from = swipe.current;
          swipe.current = null;
          if (!from || !gallery) return;
          const dx = e.changedTouches[0].clientX - from.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.changedTouches[0].clientY - from.y) * 1.5) go(dx < 0 ? 1 : -1);
        }}
      >
        {gallery && gallery.index > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Photo précédente"
            className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white press hover:bg-white/25"
          >
            <Icon name="chevronLeft" size={22} />
          </button>
        )}
        {gallery && gallery.index < gallery.count - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Photo suivante"
            className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white press hover:bg-white/25"
          >
            <Icon name="chevronLeft" size={22} className="rotate-180" />
          </button>
        )}
        {gallery && (
          <span className="absolute left-1/2 top-1 -translate-x-1/2 rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-white">
            {gallery.index + 1}/{gallery.count}
          </span>
        )}
        <div onClick={(e) => e.stopPropagation()} className="relative max-h-full max-w-full">
          {/* Keyed: another photo of the gallery loads afresh. */}
          <AssetImage key={asset.id} assetId={asset.id} className="max-h-[70dvh] max-w-full rounded-token object-contain" />
          {badge && <div className="absolute bottom-2 right-2">{badge}</div>}
          {hiddenNotes && <PawLayer notes={hidden.notes} onFound={hidden.found} />}
        </div>
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      >
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" disabled={saving} onClick={() => void applyToProfile("avatar")} className={action}>
            Photo de profil
          </button>
          <button type="button" disabled={saving} onClick={() => void applyToProfile("cover")} className={action}>
            Couverture du profil
          </button>
        </div>
        {message && <p className="text-center text-sm text-white">{message}</p>}
        {hiddenNotes && <HiddenNotesPanel assetId={asset.id} notes={hidden.notes} revealed={hidden.revealed} onChanged={hidden.reload} />}
      </div>
    </div>,
    document.body,
  );
}
